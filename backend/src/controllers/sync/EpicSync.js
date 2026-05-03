import axios from "axios";
import config from "../../config/env.js";
import userModel from "../../models/User.js";
import { getUserFriendList } from "../allEpicInfo.js";
import { uploadImageFromUrl } from "../../utils/imageUpload.js";

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

    // Sync Friends
    const existingFriends = dbUser.friends?.get("Epic") || [];
    const friends = await getUserFriendList(eosAccessToken, epicId, existingFriends);

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
    if (accIdx > -1) epicAccounts[accIdx] = { ...epicAccounts[accIdx], ...accountData };
    else epicAccounts.push(accountData);
    linkedAccounts.set("Epic", epicAccounts);
    dbUser.linkedAccounts = linkedAccounts;
    dbUser.markModified("linkedAccounts");

    // Update Friends
    if (!dbUser.friends) dbUser.friends = new Map();
    let currentFriends = dbUser.friends.get("Epic") || [];
    currentFriends = currentFriends.filter(f => f.linkedAccountId !== epicId);
    const mappedFriends = friends.map(f => ({ ...f, linkedAccountId: epicId }));
    dbUser.friends.set("Epic", [...currentFriends, ...mappedFriends]);
    dbUser.markModified("friends");

    // Update main profile picture if missing
    if (!dbUser.profilePicture && epicAvatar) {
      dbUser.profilePicture = epicAvatar;
    }

    await dbUser.save();
    console.log(`Epic Sync complete for user ${displayName} (${epicId})`);
    res.redirect(`${FRONTEND_URL}/library?sync=epic_success`);

  } catch (error) {
    console.error("Epic Sync Error:", error.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}/library?error=epic_sync_failed`);
  }
}
