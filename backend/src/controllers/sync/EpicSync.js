import axios from "axios";
import config from "../../config/env.js";
import userModel from "../../models/User.js";
import Friendship from "../../models/Friendship.js";
import { getUserFriendList } from "../allEpicInfo.js";
import { uploadImageFromUrl } from "../../utils/imageUpload.js";
import logger from "../../utils/logger.js";
import { hashId } from "../../utils/logSanitize.js";

const CLIENT_ID = config.epic.clientId;
const CLIENT_SECRET = config.epic.clientSecret;
const REDIRECT_URI = config.epic.REDIRECT_URI;
const FRONTEND_URL = config.frontendUrl;

// Step 1: Redirect to Epic login (Standard EAS Flow)
export function syncWithEpic(req, res) {
  const authUrl = `https://www.epicgames.com/id/authorize?` +
    new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope: "basic_profile friends_list presence country",
    });

  res.redirect(authUrl);
}

// Step 2: Handle OAuth callback and sync
export async function epicReturn(req, res) {
  const userId = req.session.userId;
  const code = req.query.code;
  if (!code) return res.redirect(`${FRONTEND_URL}/library?error=missing_code`);

  try {
    // 1. Exchange code for EAS token
    const tokenRes = await axios.post(
      "https://api.epicgames.dev/epic/oauth/v2/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
      {
        auth: { username: CLIENT_ID, password: CLIENT_SECRET },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10000
      }
    );

    const eosAccessToken = tokenRes.data.access_token;
    const epicId = tokenRes.data.account_id;

    // 2. Fetch User Profile (Modern v2 API)
    const profileRes = await axios.get(`https://api.epicgames.dev/epic/id/v2/accounts?accountId=${epicId}`, {
      headers: { Authorization: `Bearer ${eosAccessToken}` },
      timeout: 10000
    });
    const profile = profileRes.data?.[0];
    const displayName = profile?.displayName || "Epic User";

    // 3. Update Database
    const dbUser = await userModel.findById(userId);
    if (!dbUser) return res.status(404).json({ error: "User not found" });

    // Update Linked Account
    let linkedAccounts = dbUser.linkedAccounts || new Map();
    let epicAccounts = linkedAccounts.get("Epic") || [];
    const accountData = {
      accountId: epicId,
      displayName: displayName,
      avatar: null,
      originalAvatarUrl: null,
      lastSync: new Date()
    };
    const accIdx = epicAccounts.findIndex(acc => acc.accountId === epicId);
    const existingAcc = accIdx > -1 ? epicAccounts[accIdx] : null;

    if (accIdx > -1) epicAccounts[accIdx] = { ...epicAccounts[accIdx], ...accountData };
    else epicAccounts.push(accountData);

    linkedAccounts.set("Epic", epicAccounts);
    dbUser.linkedAccounts = linkedAccounts;
    dbUser.markModified("linkedAccounts");

    // 4. Process Friends with Diff-based Sync (Smart Update)
    const friendsList = await getUserFriendList(eosAccessToken, epicId, existingAcc?.friends || []).catch(err => {
      logger.error({ epicId: hashId(epicId), err: err.message }, 'Epic: getUserFriendList failed, skipping friends sync');
      return [];
    });
    const existingFriends = await Friendship.find({ userId, source: "Epic", linkedAccountId: epicId });
    const existingFriendsMap = new Map(existingFriends.map(f => [f.externalId, f]));

    const friendBulkOps = [];
    const newFriendExternalIds = new Set();

    for (const f of friendsList) {
      newFriendExternalIds.add(f.externalId);
      const existing = existingFriendsMap.get(f.externalId);

      const friendDoc = {
        userId,
        friendUserPublicID: existing?.friendUserPublicID || null,
        externalId: f.externalId,
        linkedAccountId: epicId,
        displayName: f.displayName,
        profileUrl: f.profileUrl,
        avatar: f.avatar,
        originalAvatarUrl: f.originalAvatarUrl,
        status: "accepted",
        source: "Epic",
        requestedByMe: false
      };

      // Only update if changed
      if (!existing || existing.displayName !== f.displayName) {
        friendBulkOps.push({
          updateOne: {
            filter: { userId, source: "Epic", externalId: f.externalId, linkedAccountId: epicId },
            update: { $set: friendDoc },
            upsert: true
          }
        });
      }
    }

    // Cleanup: Remove friends that are no longer in Epic
    const friendsToDelete = existingFriends
      .filter(f => !newFriendExternalIds.has(f.externalId))
      .map(f => f._id);

    if (friendsToDelete.length > 0) {
      friendBulkOps.push({
        deleteMany: { filter: { _id: { $in: friendsToDelete } } }
      });
    }

    if (friendBulkOps.length > 0) {
      await Friendship.bulkWrite(friendBulkOps, { ordered: false });
    }

    await dbUser.save();
    logger.info({ userId: hashId(userId), provider: 'Epic' }, 'Epic sync complete');
    res.redirect(`${FRONTEND_URL}/library?sync=epic_success`);

  } catch (error) {
    logger.error({ 
      userId: hashId(userId), 
      message: error.message, 
      status: error.response?.status,
      details: error.response?.data
    }, 'Epic sync error');
    res.redirect(`${FRONTEND_URL}/library?error=epic_sync_failed`);
  }
}
