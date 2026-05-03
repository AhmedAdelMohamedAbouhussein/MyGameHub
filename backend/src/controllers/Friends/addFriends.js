import userModel from '../../models/User.js'
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

    // Add to current user's friends (only if not already added)
    await userModel.updateOne(
      { publicID, "friends.User.user": { $ne: friendPublicID } },
      { $push: { "friends.User": { user: friendPublicID, requestedByMe: true, status: "pending" } } }
    );

    // Add to friend's friends (only if not already added)
    const friendUpdate = await userModel.updateOne(
      { publicID: friendPublicID, "friends.User.user": { $ne: publicID } },
      { $push: { "friends.User": { user: publicID, requestedByMe: false, status: "pending" } } }
    );

    // Create notification for friend (if update succeeded)
    if (friendUpdate.modifiedCount > 0) {
      await Notification.create({
        recipient: friend._id,
        sender: publicID,
        type: 'friend_request',
        message: `${user.name} sent you a friend request.`,
        link: '/managefriends'
      });
    }

    res.status(200).json({ message: "Friend request sent!" });
  } catch (err) {
    next(err);
  }
};
