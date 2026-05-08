import userModel from '../../models/User.js'
import Friendship from '../../models/Friendship.js';

export const acceptFriends = async (req, res, next) => {
  const friendPublicID = decodeURIComponent(req.params.friendId); // param now refers to friend's publicID

  try {
    // Make sure both exist
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

    // Update status to accepted for both friendship documents
    const result = await Friendship.updateMany(
      {
        $or: [
          { userId: user._id, friendUserPublicID: friendPublicID, source: "User" },
          { userId: friend._id, friendUserPublicID: publicID, source: "User" }
        ],
        status: "pending"
      },
      { $set: { status: "accepted" } }
    );

    if (result.modifiedCount === 0) {
      const error = new Error("No pending request found to accept");
      error.status = 400;
      return next(error);
    }

    res.status(200).json({ message: "Friend request accepted!" });
  } catch (err) {
    next(err);
  }
};
