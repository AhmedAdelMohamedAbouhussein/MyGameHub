import userModel from "../../../models/User.js";
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

    const userId = req.session.userId; // ✅ correct now

    const user = await userModel.findById(userId).select("ownedGames");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Convert Maps to plain objects
    const ownedGames = {};
    if (user.ownedGames) {
      for (const [platform, gamesMap] of user.ownedGames.entries()) {
        ownedGames[platform] = Object.fromEntries(gamesMap);
      }
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

    const user = await userModel.findById(userId).select("ownedGames");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.ownedGames) {
      return res.status(404).json({ message: "No owned games found" });
    }

    // Convert everything to plain objects for safe lookup
    const ownedGamesObj = {};
    for (const [plt, gamesMap] of user.ownedGames.entries()) {
      ownedGamesObj[plt] = Object.fromEntries(gamesMap);
    }

    // Case-insensitive platform lookup
    const platformKey = Object.keys(ownedGamesObj).find(
      k => k.toLowerCase() === platform.toLowerCase()
    );

    const platformGames = platformKey ? ownedGamesObj[platformKey] : null;
    if (!platformGames) {
      return res.status(404).json({ message: `No games found for platform ${platform}` });
    }

    const targetGame = platformGames[id];
    if (!targetGame) {
      return res.status(404).json({ message: `Game with id ${id} not found on ${platform}` });
    }

    // --- NEW: Dynamic Avatar & Platform Aggregation ---
    const targetName = targetGame.gameName?.toLowerCase().trim();
    const mergedOwners = [];

    // Fetch linkedAccounts to get fresh avatars without storing them redundant in every game
    const accountUser = await userModel.findById(userId).select("linkedAccounts");
    const linkedAccountsObj = {};
    if (accountUser.linkedAccounts) {
      for (const [plt, accList] of accountUser.linkedAccounts.entries()) {
        linkedAccountsObj[plt] = accList;
      }
    }

    // Search through all platforms for games with the same name
    for (const [plt, pltGames] of Object.entries(ownedGamesObj)) {
      for (const gameRecord of Object.values(pltGames)) {
        if (gameRecord.gameName?.toLowerCase().trim() === targetName) {
          const processedOwners = gameRecord.owners.map(owner => {
            const ownerObj = owner.toObject ? owner.toObject() : owner;

            // Find matching linked account for this platform/ID to get the avatar
            const platformAccounts = linkedAccountsObj[plt] || [];
            const linkedAcc = platformAccounts.find(acc => acc.accountId === ownerObj.accountId);

            return {
              ...ownerObj,
              platform: plt,
              avatar: linkedAcc?.avatar || null // Pass fresh avatar dynamically
            };
          });
          mergedOwners.push(...processedOwners);
        }
      }
    }

    // Remove duplicates
    const uniqueOwners = Array.from(new Map(mergedOwners.map(o => [`${o.platform}-${o.accountId}`, o])).values());

    const mergedGame = {
      ...targetGame.toObject ? targetGame.toObject() : targetGame,
      owners: uniqueOwners
    };

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

    // Find user by publicID
    const user = await userModel.findOne({ publicID }).select("friends");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Convert Map -> plain object
    const friends = {};
    if (user.friends) {
      for (const [platform, friendArray] of user.friends.entries()) {
        friends[platform] = friendArray; // friendArray is already plain objects
      }
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
