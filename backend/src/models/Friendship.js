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
// Compound index to avoid duplicate friendships from the same external account
FriendshipSchema.index({ userId: 1, source: 1, externalId: 1 }, { unique: true, sparse: true });

export default mongoose.model('Friendship', FriendshipSchema);
