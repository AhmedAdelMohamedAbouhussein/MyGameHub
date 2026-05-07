import mongoose from 'mongoose';

const ownerSchema = new mongoose.Schema({
    accountId: { type: String, required: true }, // The external ID of the specific account (e.g. SteamID)
    accountName: { type: String },               // Cached display name for the account
    hoursPlayed: { type: String, default: null },
    lastPlayed: { type: Date, default: null },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    currentGamerscore: { type: Number },
    maxGamerscore: { type: Number },
    achievements: [
        {
            id: { type: String }, // Platform-specific achievement ID
            title: { type: String },
            description: { type: String },
            unlocked: { type: Boolean, default: false },
            dateUnlocked: { type: Date },
            type: { type: String, enum: ["default", "bronze", "silver", "gold", "platinum"], default: "default" },
            gamerscore: { type: Number },
        }
    ]
}, { _id: false });

const userGameSchema = new mongoose.Schema({
    gameName: {
        type: String,
        required: true,
    },
    gameId: {
        type: String, // This remains the platform-specific ID for raw storage, but title is used for unification
        required: true,
    },
    platform: {
        type: String,
        required: true,
    },
    coverImage: {
        type: String, // URL to the game's cover image
        default: null,
    },
    // The owners array tracks multiple accounts owning this game on this platform (or unifies across platforms in the UI)
    owners: [ownerSchema],

    // Summary stats (Max/Total across all owners)
    totalHours: { type: String },
    maxProgress: { type: Number, default: 0 }
}, { _id: false });

export default userGameSchema; // ✅ export schema, not model