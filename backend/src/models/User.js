import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { nanoid } from "nanoid";
import { deleteImageByUrl } from '../utils/imageUpload.js';
import config from '../config/env.js';
import userGameSchema from './UserGames.js';

const algorithm = config.security.algorithm;
const ENCRYPTION_KEY = Buffer.from(config.security.encryptionKey, 'hex'); // 32 bytes key
const IV_LENGTH = config.security.ivLength;
const BCRYPT_SALT_ROUNDS = config.security.bcryptSaltRounds

function encrypt(text) {
    if (!text) return null;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(algorithm, ENCRYPTION_KEY, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // Combine iv and encrypted text with colon separator
        return iv.toString('hex') + ':' + encrypted;
    }
    catch (error) {
        console.error('Encryption error:', error);
        return null;
    }
}

function decrypt(data) {
    if (!data) return null;
    try {
        const parts = data.split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encryptedText = parts.join(':');
        const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}

const generatePublicID = async function (name) {
    let isUnique = false;
    let newID;

    while (!isUnique) {
        const cleanName = (name || "User").replace(/\s+/g, "");
        const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5-digit number
        newID = `${cleanName}#${randomDigits}`;

        const existing = await mongoose.models.User.findOne({ publicID: newID });
        if (!existing) isUnique = true;
    }

    return newID;
};

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
    ownedGames: {
        type: Map,
        of: {
            type: Map,
            of: userGameSchema
        },
    },
    favoriteGames: [{
        platform: { type: String, required: true },
        gameId: { type: String, required: true },
        gameName: { type: String },
        coverImage: { type: String },
        hoursPlayed: { type: Number, default: 0 },
        progress: { type: Number, default: 0 }
    }],
    wishlist: [{
        gameId: { type: String, required: true }, // RAWG ID
        itadId: { type: String }, // ITAD ID for reliable price tracking
        gameName: { type: String }, // Stored for display and fallback
        targetStores: [{ type: String }], // Array of store names to track
        storePrices: [{ // Historical and tracking data per store
            storeName: { type: String },
            initialPrice: { type: Number },
            lastNotifiedPrice: { type: Number }
        }],
        addedAt: { type: Date, default: Date.now }
    }],
    likes: [{ type: String, index: true }],
    friends: {
        type: Map,
        of: [
            new mongoose.Schema(
                {
                    user: { type: String, required: false },
                    externalId: { type: String },
                    linkedAccountId: { type: String }, // The local user's account that linked this friend
                    displayName: { type: String },
                    profileUrl: { type: String },
                    avatar: { type: String }, // Cloudinary URL
                    originalAvatarUrl: { type: String }, // Source platform URL
                    friendsSince: { type: Date },
                    status: { type: String, enum: ["pending", "accepted"], default: "pending" },
                    source: { type: String, enum: ["User", "Steam", "Xbox", "Epic", "PSN", "Nintendo", "GOG"], default: "User" },
                    requestedByMe: { type: Boolean, default: true },
                },
                { _id: false }
            )
        ],
    },
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
    }
},
    {
        timestamps: true,
        toJSON: { getters: true },
        toObject: { getters: true }
    });

UserSchema.set('toJSON',
    {
        transform: function (doc, ret, options) {
            ret.hasPassword = !!(doc.password || (doc._doc && doc._doc.password));
            delete ret.password;

            // Clean up linkedAccounts tokens in the JSON response
            if (ret.linkedAccounts) {
                for (const key in ret.linkedAccounts) {
                    ret.linkedAccounts[key] = ret.linkedAccounts[key].map(acc => {
                        const cleanAcc = { ...acc };
                        delete cleanAcc.refreshToken;
                        delete cleanAcc.expiresAt;
                        return cleanAcc;
                    });
                }
            }

            delete ret.ownedGames;
            delete ret.friends;
            delete ret.wishlist;
            delete ret.updatedAt;
            delete ret.signupDate;
            delete ret.createdAt;
            delete ret.isDeleted;
            delete ret.isVerified;
            delete ret.role;
            delete ret.__v;
            delete ret._id;
            if (ret.resendCount) {
                delete ret.resendCount.emailVerification?.count;
                delete ret.resendCount.emailVerification?.lastReset;
                delete ret.resendCount.passwordReset?.count;
                delete ret.resendCount.passwordReset?.lastReset;
                delete ret.resendCount.restoreAccount?.count;
                delete ret.resendCount.restoreAccount?.lastReset;
                delete ret.resendCount.permanentlyDeleteAccount?.count;
                delete ret.resendCount.permanentlyDeleteAccount?.lastReset;
            }
            return ret;
        }
    });

// Also apply the same transformation to toObject for consistency
UserSchema.set('toObject', {
    getters: true,
    transform: UserSchema.get('toJSON').transform
});


UserSchema.pre('validate', async function (next) {
    if (!this.publicID) {
        this.publicID = await generatePublicID(this.name);
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

        await this.constructor.updateMany(
            {},
            {
                $pull: {
                    "friends.User": { user: userPublicID }
                }
            }
        );

        next();
    } catch (error) {
        next(error);
    }
});


export default mongoose.model('User', UserSchema);
