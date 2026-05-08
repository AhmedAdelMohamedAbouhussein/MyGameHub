import mongoose from 'mongoose';

const ownerSchema = new mongoose.Schema({
    accountId: { type: String, required: true },
    accountName: { type: String },
    hoursPlayed: { type: String, default: null },
    lastPlayed: { type: Date, default: null },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    currentGamerscore: { type: Number },
    maxGamerscore: { type: Number },
    achievements: [
        {
            id: { type: String },
            title: { type: String },
            description: { type: String },
            unlocked: { type: Boolean, default: false },
            dateUnlocked: { type: Date },
            type: { type: String, enum: ["default", "bronze", "silver", "gold", "platinum"], default: "default" },
            gamerscore: { type: Number },
        }
    ]
}, { _id: false });

const UserGameSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    gameName: {
        type: String,
        required: true,
    },
    gameId: {
        type: String,
        required: true,
    },
    platform: {
        type: String,
        required: true,
        index: true
    },
    coverImage: {
        type: String,
        default: null,
    },
    owners: [ownerSchema],
    totalHours: { type: String },
    maxProgress: { type: Number, default: 0 }
}, { timestamps: true });

// Compound index to quickly find a specific game for a user
UserGameSchema.index({ userId: 1, platform: 1, gameId: 1 }, { unique: true });

export default mongoose.model('UserGame', UserGameSchema);
