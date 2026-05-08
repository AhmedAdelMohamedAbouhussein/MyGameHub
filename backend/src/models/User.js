import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { deleteImageByUrl } from '../utils/imageUpload.js';
import config from '../config/env.js';
import { encrypt, decrypt } from '../utils/cryptoUtils.js';
import { generatePublicID, generateProfileHandle } from '../utils/userUtils.js';
import { userTransform } from './transforms/userTransform.js';

const BCRYPT_SALT_ROUNDS = config.security.bcryptSaltRounds;

const linkedAccountSchema = new mongoose.Schema({
    accountId: { type: String, required: true },
    displayName: { type: String },
    avatar: { type: String }, // Cloudinary URL
    originalAvatarUrl: { type: String }, // Source platform URL (Steam, Xbox, etc.)
    refreshToken: {
        type: String,
        set: encrypt,
        get: decrypt,
        select: false
    },
    expiresAt: {
        type: Date,
        select: false
    },
    lastSync: { type: Date, default: Date.now },
    // 'invalid' means the token failed auth and the user must re-sync
    tokenStatus: {
        type: String,
        enum: ['active', 'invalid'],
        default: 'active'
    }
}, { _id: false });

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    publicID: {
        type: String,
        unique: true,
        required: true,
        index: true,
    },
    profileHandle: {
        type: String,
        unique: true,
        sparse: true, // allows null during migration
        index: true,
    },
    email: {
        type: String,
        index: true,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Invalid email format"]
    },
    password: {
        type: String,
        minlength: 8,
        maxlength: 50,
        select: false,
        validate:
        {
            validator: function (v) {
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v);
            },
            message: "Password must contain at least 1 uppercase, 1 lowercase, and 1 number"
        }
    },

    bio: {
        type: String,
        maxlength: 300,
    },
    profileVisibility: {
        type: String,
        enum: ["public", "private"], default: "public"
    },
    allowPublicFriendRequests: {
        type: Boolean,
        default: true
    },
    profileBackground: {
        type: String, // URL to uploaded background image
        default: null
    },
    themeSongId: {
        type: String, // Spotify Track ID
        default: null
    },
    masterpieceGame: {
        platform: { type: String },
        gameId: { type: String },
        gameName: { type: String },
        coverImage: { type: String },
        quote: { type: String, maxlength: 100 }
    },
    isDeleted: {
        type: Boolean,
        index: true,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    profilePicture: {
        type: String,
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },

    // New Multi-Account Structure
    linkedAccounts: {
        type: Map,
        of: [linkedAccountSchema]
    },

    signupDate: {
        type: Date,
        default: Date.now
    },
    favoriteGames: [{
        platform: { type: String, required: true },
        gameId: { type: String, required: true },
        gameName: { type: String },
        coverImage: { type: String },
        hoursPlayed: { type: Number, default: 0 },
        progress: { type: Number, default: 0 }
    }],
    likes: [{ type: String, index: true }],
    resendCount: {
        emailVerification: {
            count: { type: Number, default: 0, select: false },
            lastReset: { type: Date, default: Date.now, select: false },
        },
        passwordReset: {
            count: { type: Number, default: 0, select: false },
            lastReset: { type: Date, default: Date.now, select: false }
        },
        restoreAccount: {
            count: { type: Number, default: 0, select: false },
            lastReset: { type: Date, default: Date.now, select: false }
        },
        permanentlyDeleteAccount: {
            count: { type: Number, default: 0, select: false },
            lastReset: { type: Date, default: Date.now, select: false }
        },
        deactivateAccount: {
            count: { type: Number, default: 0, select: false },
            lastReset: { type: Date, default: Date.now, select: false }
        }
    },
    //plan: {
    //    type: {
    //        type: String,
    //        enum: ["free", "pro"],
    //        default: "free"
    //    },
    //    expiresAt: {
    //        type: Date,
    //        default: null
    //    }
    //},
    //
    //usage: {
    //    syncCount: {
    //        type: Number,
    //        default: 0
    //    },
    //    searchCount: {
    //        type: Number,
    //        default: 0
    //    },
    //    alertChecks: {
    //        type: Number,
    //        default: 0
    //    },
    //    lastReset: {
    //        type: Date,
    //        default: Date.now
    //    }
    //}
},
    {
        timestamps: true,
        toJSON: { getters: true },
        toObject: { getters: true }
    });

UserSchema.set('toJSON', {
    transform: userTransform
});

UserSchema.set('toObject', {
    getters: true,
    transform: userTransform
});


UserSchema.pre('validate', async function (next) {
    if (!this.publicID) {
        this.publicID = await generatePublicID(this.name);
    }
    if (!this.profileHandle) {
        this.profileHandle = await generateProfileHandle();
    }
    next();
});

// Hash password before saving if present
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();

    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.pre(['findOneAndUpdate', 'updateOne'], async function (next) {
    let update = this.getUpdate();

    // Normalize if $set exists
    if (update.$set && update.$set.password) {
        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        update.$set.password = await bcrypt.hash(update.$set.password, salt);
    } else if (update.password) {
        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        update.password = await bcrypt.hash(update.password, salt);
    }

    next();
});


// Compare passwords only if password exists
UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    const ismatch = await bcrypt.compare(candidatePassword, this.password);

    return ismatch;
};


UserSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    try {
        // `this` is the document itself in document middleware
        const userPublicID = this.publicID;

        // Delete assets from Cloudinary
        if (this.profilePicture) {
            await deleteImageByUrl(this.profilePicture, "profile_pics");
        }

        if (this.profileBackground) {
            await deleteImageByUrl(this.profileBackground, "profile_backgrounds");
        }

        // Delete all owned games documents
        await mongoose.model('UserGame').deleteMany({ userId: this._id });

        // Delete all friendships
        await mongoose.model('Friendship').deleteMany({ userId: this._id });

        // Delete all wishlist items
        await mongoose.model('WishlistItem').deleteMany({ userId: this._id });

        // Remove this user from others' friend lists (User source only)
        await mongoose.model('Friendship').deleteMany({ friendUserPublicID: userPublicID });

        next();
    } catch (error) {
        next(error);
    }
});


export default mongoose.model('User', UserSchema);
