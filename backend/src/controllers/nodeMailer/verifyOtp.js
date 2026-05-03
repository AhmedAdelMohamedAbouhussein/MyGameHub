import crypto from "crypto";

import OtpSchema from '../../models/Otp.js'
import userModel from '../../models/User.js'
import PasswordResetToken from "../../models/PasswordResetToken.js";

// @desc   Verify user's OTP
// @route  POST /api/mail/verifyOtp
export const verifyOtp = async (req, res, next) => {
    try {
        const { userId, otp, purpose } = req.body;

        if (!userId || !otp || !purpose) {
            const error = new Error("Missing OTP or userId");
            error.status = 400;
            return next(error);
        }

        if (!["email_verification", "password_reset", "restore_account", "permanently_delete_account", "deactivate_account"].includes(purpose)) {
            const error = new Error("Invalid OTP purpose");
            error.status = 400;
            return next(error);
        }

        const user = await userModel.findById(userId);
        if (!user) {
            const error = new Error("Invalid user ID");
            error.status = 400;
            return next(error);
        }

        const userOtpVerification = await OtpSchema.findOne({ userId, purpose: purpose }).sort({ createdAt: -1 });

        if (!userOtpVerification) {
            const error = new Error("OTP expired, please request a new one.");
            error.status = 400;
            return next(error);
        }
        else {
            const now = new Date();
            const expiresAt = new Date(userOtpVerification.createdAt.getTime() + 10 * 60000);
            if (now > expiresAt) {
                await OtpSchema.deleteOne({ _id: userOtpVerification._id });
                const error = new Error("OTP expired, please request a new one.");
                error.status = 400;
                return next(error);
            }
        }

        if (userOtpVerification.attempts >= 5) {
            await OtpSchema.deleteOne({ _id: userOtpVerification._id });
            const error = new Error("Too many failed attempts. request a new one.");
            error.status = 429;
            return next(error);
        }

        // Verify OTP
        const isMatch = await userOtpVerification.compareOtp(otp);
        if (!isMatch) {
            // Increment attempts
            await OtpSchema.updateOne({ _id: userOtpVerification._id }, { $inc: { attempts: 1 } });

            const error = new Error(`Invalid OTP. You have ${5 - userOtpVerification.attempts - 1} attempts left.`);
            error.status = 401;
            return next(error);
        }


        if (purpose === "email_verification") {
            await userModel.updateOne({ _id: userId, isDeleted: false }, { isVerified: true, 'resendCount.emailVerification.count': 0, 'resendCount.emailVerification.lastReset': new Date() });

            // Delete OTP after success
            await OtpSchema.deleteOne({ _id: userOtpVerification._id });

            req.session.userId = userId;
            req.session.cookie.maxAge = 1000 * 60 * 60 * 24;

            return req.session.save(err => {
                if (err) {
                    err.logContext = {};
                    return next(err);
                }
                return res.status(200).json({ message: "Email verified successfully, redirecting to Landing Page......" });
            });

        }
        else if (purpose === "password_reset") {
            await userModel.updateOne({ _id: userId, isDeleted: false }, { 'resendCount.passwordReset.count': 0, 'resendCount.passwordReset.lastReset': new Date() });

            // Delete OTP after success
            await OtpSchema.deleteOne({ _id: userOtpVerification._id });

            // Generate a secure random token (plain)
            const plainToken = crypto.randomBytes(32).toString("hex");

            //delete old tokens
            await PasswordResetToken.deleteMany({ userId: userId });

            // Save hashed version in DB
            await PasswordResetToken.createToken(userId, plainToken);

            return res.json({
                message: "OTP verified successfully. Use this token to reset your password.",
                userId,
                verified: true,
                resetToken: plainToken, // ⚠️ send plain token only once
            });
        }
        else if (purpose === "restore_account") {
            await userModel.updateOne({ _id: userId }, { isDeleted: false, 'resendCount.restoreAccount.count': 0, 'resendCount.restoreAccount.lastReset': new Date() });

            // Delete OTP after success
            await OtpSchema.deleteOne({ _id: userOtpVerification._id });

            return res.json({
                message: "Account restored successfully",
                userId,
                verified: true
            });
        }
        else if (purpose === "permanently_delete_account") {
            // Must use document.deleteOne() (not query) to trigger the friends-cleanup pre-hook
            const userToDelete = await userModel.findById(userId);
            if (userToDelete) {
                await userToDelete.deleteOne();
            }

            // Delete OTP after success
            await OtpSchema.deleteOne({ _id: userOtpVerification._id });

            req.session.destroy((err) => {
                if (err) return next(err);
                res.clearCookie("connect.sid");
            });

            return res.json({
                message: "Account permanently deleted successfully",
            });
        }
        else if (purpose === "deactivate_account") {
            await userModel.updateOne(
                { _id: userId },
                { isDeleted: true, deletedAt: new Date(), 'resendCount.deactivateAccount.count': 0, 'resendCount.deactivateAccount.lastReset': new Date() }
            );


            req.session.destroy((err) => {
                if (err) return next(err);
                res.clearCookie("connect.sid");
            });

            // Delete OTP after success
            await OtpSchema.deleteOne({ _id: userOtpVerification._id });

            return res.json({
                message: "Account deactivated successfully. It will be permanently deleted after 30 days.",
            });
        }
    }
    catch (error) {
        next(error);
    }
};
