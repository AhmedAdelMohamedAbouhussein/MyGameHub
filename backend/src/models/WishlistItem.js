import mongoose from 'mongoose';

const WishlistItemSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    gameId: { type: String, required: true },
    itadId: { type: String },
    gameName: { type: String },
    targetStores: [{ type: String }],
    storePrices: [{
        storeName: { type: String },
        initialPrice: { type: Number },
        lastNotifiedPrice: { type: Number }
    }],
    addedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index to prevent duplicate wishlist items for a user
WishlistItemSchema.index({ userId: 1, gameId: 1 }, { unique: true });

export default mongoose.model('WishlistItem', WishlistItemSchema);
