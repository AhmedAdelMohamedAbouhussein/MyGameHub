import userModel from '../../models/User.js'
import Friendship from '../../models/Friendship.js';

export const removeFriends = async (req, res, next) => {
  const friendPublicID = decodeURIComponent(req.params.friendId); // param now refers to friend's publicID

  try {
    // Ensure both users exist
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

    // Delete friendships for both users
    const result = await Friendship.deleteMany({
        $or: [
            { userId: user._id, friendUserPublicID: friendPublicID, source: "User" },
            { userId: friend._id, friendUserPublicID: publicID, source: "User" }
        ]
    });

    if (result.deletedCount === 0) {
        const error = new Error("Friendship not found");
        error.status = 400;
        return next(error);
    }

    res.status(200).json({ message: "Friend removed successfully" });
  } catch (err) {
    next(err);
  }
};
