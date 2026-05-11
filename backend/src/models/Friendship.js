import mongoose from 'mongoose';

const FriendshipSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // If the friend is also a user on our platform
    friendUserPublicID: {
        type: String,
        ref: 'User',
        index: true
    },
    // Platform-specific ID (SteamID, Xbox XUID, etc.)
    externalId: {
        type: String,
        index: true
    },
    // Which local account "owns" this friend connection
    linkedAccountId: {
        type: String,
        index: true
    },
    displayName: {
        type: String,
        required: true
    },
    profileUrl: { type: String },
    avatar: { type: String },
    originalAvatarUrl: { type: String },
    friendsSince: { type: Date },
    status: {
        type: String,
        enum: ["pending", "accepted"],
        default: "pending"
    },
    source: {
        type: String,
        enum: ["User", "Steam", "Xbox", "Epic", "PSN"],
        default: "User"
    },
    requestedByMe: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Compound index to quickly find friends on a specific platform
FriendshipSchema.index({ userId: 1, source: 1 });
// Unique index to prevent duplicate platform friendships (Steam/Xbox/Epic/PSN only).
// partialFilterExpression excludes "User"-source records so null externalId never collides.
FriendshipSchema.index(
    { userId: 1, source: 1, externalId: 1 },
    {
        unique: true,
        partialFilterExpression: { source: { $in: ['Steam', 'Xbox', 'Epic', 'PSN'] } }
    }
);
// Unique index for on-platform (User-source) friendships keyed by publicID pair
FriendshipSchema.index(
    { userId: 1, friendUserPublicID: 1 },
    {
        unique: true,
        partialFilterExpression: { source: 'User' }
    }
);

export default mongoose.model('Friendship', FriendshipSchema);
