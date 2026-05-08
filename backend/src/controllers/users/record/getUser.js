import userModel from "../../../models/User.js";
import UserGame from "../../../models/UserGame.js";
import Friendship from "../../../models/Friendship.js";
import config from '../../../config/env.js';
import logger from '../../../utils/logger.js';
import { hashId } from '../../../utils/logSanitize.js';

const APP_BACKEND_URL = config.appUrl;
const APP_FRONTEND_URL = config.frontendUrl;


// @desc   Get user by publicID
// @route  GET /api/users/:publicID
export const getUserById = async (req, res, next) => {
  try {
    const publicID = decodeURIComponent(req.params.publicID);

    logger.debug({ publicID: hashId(publicID) }, 'Fetching user by publicID');
    if (!publicID) {
      const err = new Error("User publicID is required");
      err.status = 400;
      return next(err);
    }

    const user = await userModel.findOne({ publicID }).select('-email -linkedAccounts');

    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      return next(err);
    }

    res.status(200).json({ user });
  }
  catch (error) {
    return next(error);
  }
};




// @desc   Get user by ID
// @route  POST /api/users/getuseridbyemail
export const getUserIdByEmail = async (req, res, next) => {
  try {
    const email = req.body.email;
    if (!email || typeof email !== 'string') {
      const err = new Error("User Email is required and must be a string");
      err.status = 400;
      return next(err);
    }

    const user = await userModel.findOne({ email: email });
    if (!user) {
      const err = new Error("User email not found");
      err.status = 404;
      return next(err);
    }

    res.status(200).json({ userId: user._id });
  }
  catch (error) {
    const err = new Error("Wasn't able to get user");
    next(err);
  }
};

const ONE_DAY = 1000 * 60 * 60 * 24;
const SEVEN_DAYS = ONE_DAY * 7;

export async function authenticateUser(email, password) {
  if (!email || !password) {
    throw { status: 400, message: "Email and password are required" };
  }

  // Check active user
  const user = await userModel.findOne({ email, isDeleted: false }).select('+password +isVerified');
  if (user) {
    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw { status: 401, message: "Invalid Password" };

    if (user.isVerified === false) {
      return {
        status: 409,
        data: {
          message: "Please verify your account to login",
          verifyLink: `/verify?userId=${user._id}&email=${encodeURIComponent(user.email)}&purpose=email_verification`,
        }
      };
    }

    return {
      status: 200,
      data: { userId: user._id, message: "User logged in successfully" }
    };
  }

  // Check deleted user
  const deletedUser = await userModel.findOne({ email, isDeleted: true });
  if (deletedUser) {
    return {
      status: 409,
      data: {
        message: "This email is associated with a deleted account. Would you like to restore or permanently delete it?",
        restoreLink: `/verify?userId=${deletedUser._id}&email=${encodeURIComponent(deletedUser.email)}&purpose=restore_account`,
        permanentDelete: `/verify?userId=${deletedUser._id}&email=${encodeURIComponent(deletedUser.email)}&purpose=permanently_delete_account`,
      }
    };
  }

  throw { status: 404, message: "Invalid Email" };
}


// @desc   Login user
// @route  POST /api/users/login
export const loginUser = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    const result = await authenticateUser(email, password);

    if (result.status === 200) {
      const { userId } = result.data;
      req.session.userId = userId;
      req.session.cookie.maxAge = rememberMe ? SEVEN_DAYS : ONE_DAY;

      return req.session.save(err => {
        if (err) {
          err.logContext = { userId: hashId(userId) };
          return next(err);
        }
        return res.status(200).json({ message: "Login successful redirecting to Landing Page......" });
      });
    }
    else {
      return res.status(result.status).json(result.data);
    }
  }
  catch (error) {
    return next(error);
  }
};

// @desc   get user owned games
// @route  POST /api/users/ownedgames
export const getUserOwnedGames = async (req, res, next) => {
  try {
    const mongoose = (await import('mongoose')).default;
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Fetch all games for this user (using lean for performance)
    const games = await UserGame.find({ userId: userObjectId }).lean();

    // Group by platform to maintain the original API response structure
    const ownedGames = {};
    for (const gameObj of games) {
      if (!ownedGames[gameObj.platform]) {
        ownedGames[gameObj.platform] = {};
      }
      // Ensure owners is always an array
      if (!gameObj.owners) gameObj.owners = [];
      
      // Surface primary stats for the frontend library view
      if (gameObj.owners.length > 0) {
        gameObj.progress = gameObj.maxProgress || gameObj.owners[0].progress || 0;
        gameObj.achievements = gameObj.owners[0].achievements || [];
      } else {
        gameObj.progress = 0;
        gameObj.achievements = [];
      }

      ownedGames[gameObj.platform][gameObj.gameId] = gameObj;
    }

    res.status(200).json({ ownedGames });
  } catch (err) {
    next(err);
  }
};


// @desc   Get a specific owned game
// @route  POST /api/users/ownedgames/:platform/:id
export const getUserOwnedGame = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { platform, id } = req.params;

    // Find the specific game across all platforms (case-insensitive platform check)
    const targetGame = await UserGame.findOne({ 
      userId, 
      platform: { $regex: new RegExp(`^${platform}$`, 'i') }, 
      gameId: id 
    });

    if (!targetGame) {
      // Fallback: try finding by gameId and userId alone if platform mismatch
      const fallbackGame = await UserGame.findOne({ userId, gameId: id });
      if (!fallbackGame) {
        return res.status(404).json({ message: `Game with id ${id} not found.` });
      }
      return res.status(301).json({ 
        message: "Platform mismatch, redirecting...", 
        redirectPlatform: fallbackGame.platform 
      });
    }

    const targetName = targetGame.gameName?.toLowerCase().trim();
    const escapedName = targetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Fetch all versions of this game (across platforms) to merge owner data
    const allVersions = await UserGame.find({ 
      userId, 
      gameName: { $regex: new RegExp(`^${escapedName}$`, 'i') } 
    });

    const mergedOwners = [];

    // Fetch linkedAccounts for fresh avatars
    const accountUser = await userModel.findById(userId).select("linkedAccounts");
    const linkedAccountsObj = {};
    if (accountUser && accountUser.linkedAccounts) {
      for (const [plt, accList] of accountUser.linkedAccounts.entries()) {
        linkedAccountsObj[plt] = accList;
      }
    }

    for (const gameRecord of allVersions) {
      const processedOwners = gameRecord.owners.map(owner => {
        const ownerObj = owner.toObject ? owner.toObject() : owner;
        const platformAccounts = linkedAccountsObj[gameRecord.platform] || [];
        const linkedAcc = platformAccounts.find(acc => acc.accountId === ownerObj.accountId);

        return {
          ...ownerObj,
          platform: gameRecord.platform,
          avatar: linkedAcc?.avatar || null
        };
      });
      mergedOwners.push(...processedOwners);
    }

    // Deduplicate owners
    const uniqueOwners = Array.from(new Map(mergedOwners.map(o => [`${o.platform}-${o.accountId}`, o])).values());

    const mergedGame = {
      ...targetGame.toObject(),
      owners: uniqueOwners
    };

    // Surface achievements and gamerscore for the primary platform requested (if available)
    const primaryOwner = uniqueOwners.find(o => o.platform === platform && o.accountId === id) || uniqueOwners[0];
    if (primaryOwner) {
      mergedGame.achievements = primaryOwner.achievements || [];
      mergedGame.progress = primaryOwner.progress || 0;
      mergedGame.currentGamerscore = primaryOwner.currentGamerscore || 0;
      mergedGame.maxGamerscore = primaryOwner.maxGamerscore || 0;
    }

    // Safety check: ensure achievements exist at top level if there is only one owner (common case)
    if (uniqueOwners.length === 1 && !mergedGame.achievements) {
        mergedGame.achievements = uniqueOwners[0].achievements;
        mergedGame.currentGamerscore = uniqueOwners[0].currentGamerscore;
        mergedGame.maxGamerscore = uniqueOwners[0].maxGamerscore;
    }

    res.status(200).json({ game: mergedGame });
  } catch (err) {
    next(err);
  }
};




// @desc   get user friend list
// @route  POST /api/users/friendlist
export const getUserFriendList = async (req, res, next) => {
  try {
    const { publicID } = req.body;

    if (!publicID || typeof publicID !== 'string') {
      return res.status(400).json({ message: "publicID is required and must be a string" });
    }

    const user = await userModel.findOne({ publicID });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Determine if the requester is the owner of the profile
    const isOwner = req.session.userId && user._id.toString() === req.session.userId;

    // Fetch friends from normalized collection
    const friendDocs = await Friendship.find({ userId: user._id });

    // Group and scrub
    const friends = {};
    for (const f of friendDocs) {
      if (!friends[f.source]) {
        friends[f.source] = [];
      }

      const friendData = f.toObject();
      // Aliases for frontend compatibility
      friendData.user = f.friendUserPublicID;
      friendData.publicID = f.friendUserPublicID;
      friendData.name = f.displayName;
      
      // Scrub sensitive IDs for non-owners on non-native platforms
      if (f.source !== "User" && !isOwner) {
        delete friendData.externalId;
        delete friendData.linkedAccountId;
      }
      
      friends[f.source].push(friendData);
    }

    res.status(200).json({ friends });
  } catch (err) {
    next(err);
  }
};

// @desc   Get multiple users by publicIDs in a single query (batching)
// @route  POST /api/users/batch
export const getBatchUsers = async (req, res, next) => {
  try {
    const { publicIDs } = req.body;

    if (!Array.isArray(publicIDs)) {
      return res.status(400).json({ message: "publicIDs must be an array" });
    }

    if (publicIDs.length === 0) {
      return res.status(200).json({ users: [] });
    }

    if (!publicIDs.every(id => typeof id === 'string')) {
      return res.status(400).json({ message: "All publicIDs must be strings" });
    }

    // Single query to get all users
    const users = await userModel.find({ publicID: { $in: publicIDs }, isDeleted: false }).select('-email -linkedAccounts');

    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};
