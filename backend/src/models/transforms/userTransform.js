export const userTransform = (doc, ret) => {
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

    //delete ret.plan;
    //delete ret.usage;
    delete ret.ownedGames;
    delete ret.friends;
    delete ret.wishlist;
    delete ret.likes;
    delete ret.deletedAt;
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
};
