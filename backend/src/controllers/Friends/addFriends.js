import userModel from '../../models/User.js'
import Friendship from '../../models/Friendship.js';
import Notification from '../../models/Notification.js';
import logger from '../../utils/logger.js';
import { hashId } from '../../utils/logSanitize.js';

export const addFriends = async (req, res, next) => {
  const friendPublicID = decodeURIComponent(req.params.friendId); // param now refers to friend's publicID

  try {
    // Check that both users exist
    const [user, friend] = await Promise.all([
      userModel.findById(req.session.userId),
      userModel.findOne({ publicID: friendPublicID }),
    ]);

    if (!user || !friend) {
      const error = new Error("One or both users not found");
      error.status = 404;
      return next(error);
    }

    const publicID = user.publicID;

    logger.debug({ from: hashId(publicID), to: hashId(friendPublicID) }, 'Friend request sent');

    // Prevent adding yourself
    if (publicID === friendPublicID) {
      const error = new Error("You cannot add yourself as a friend");
      error.status = 400;
      return next(error);
    }

    // Check if friendship already exists
    const existing = await Friendship.findOne({ userId: user._id, friendUserPublicID: friendPublicID, source: "User" });
    if (existing) {
        return res.status(400).json({ message: "Friendship already exists or request pending" });
    }

    // Create friendship for sender
    await Friendship.create({
        userId: user._id,
        friendUserPublicID: friendPublicID,
        displayName: friend.name,
        avatar: friend.profilePicture,
        status: "pending",
        source: "User",
        requestedByMe: true
    });

    // Create friendship for receiver
    await Friendship.create({
        userId: friend._id,
        friendUserPublicID: publicID,
        displayName: user.name,
        avatar: user.profilePicture,
        status: "pending",
        source: "User",
        requestedByMe: false
    });

    // Create notification for friend
    await Notification.create({
        recipient: friend._id,
        sender: publicID,
        type: 'friend_request',
        message: `${user.name} sent you a friend request.`,
        link: '/managefriends'
    });

    res.status(200).json({ message: "Friend request sent!" });
  } catch (err) {
    next(err);
  }
};
