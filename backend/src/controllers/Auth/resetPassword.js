import userModel from "../../models/User.js";
import PasswordResetToken from "../../models/PasswordResetToken.js";
import logger from "../../utils/logger.js";

// @desc   Reset password using token
// @route  POST /api/auth/resetpassword
export const resetPassword = async (req, res, next) => {
    try {
        const { userId, token, newPassword } = req.body;

        // Validate password with regex
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            const error = new Error("Password must be at least 8 characters long, contain one uppercase letter, one lowercase letter, and one number.");
            error.status = 400;
            return next(error);
        }

        const user = await userModel.findById(userId);
        if (!user || user.isDeleted === true) {
            const error = new Error("User not found or inactive.");
            error.status = 404;
            return next(error);
        }

        // Find token doc
        const tokenDoc = await PasswordResetToken.findOne({ userId }).sort({ createdAt: -1 });
        if (!tokenDoc) {
            const error = new Error("Invalid or expired reset token.");
            error.status = 400;
            return next(error);
        }
        else {
            const now = new Date();
            const expiresAt = new Date(tokenDoc.createdAt.getTime() + 5 * 60000);
            if (now > expiresAt) {
                await PasswordResetToken.deleteOne({ _id: tokenDoc._id });
                const error = new Error("reset token, please request a new one.");
                error.status = 400;
                return next(error);
            }
        }

        // Compare provided token with hashed one
        const isValid = await tokenDoc.compareToken(token);
        if (!isValid) {
            const error = new Error("Invalid reset token.");
            error.status = 400;
            return next(error);
        }

        // Update user password
        await userModel.findByIdAndUpdate(userId, { $set: { password: newPassword } });

        // Mark token as used
        await PasswordResetToken.findByIdAndDelete(tokenDoc._id);

        res.status(200).json({ message: "Password reset successful." });
    }
    catch (err) {
        logger.error({ err }, 'resetPassword error');
        res.status(500).json({ message: "Server error during password reset." });
    }
};
