import userModel from "../../../models/User.js";
import bcrypt from "bcrypt";

/**
 * @desc    Set initial password for users who signed up via Google
 * @route   POST /api/users/set-initial-password
 * @access  Private (Session-based)
 */
export const setInitialPassword = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { password } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized. Please log in." });
        }

        if (!password) {
            return res.status(400).json({ message: "Password is required" });
        }

        // Fetch user with password field (since it's select: false)
        const user = await userModel.findById(userId).select("+password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // SECURITY CHECK: Only allow setting if password doesn't exist
        if (user.password) {
            return res.status(400).json({ message: "Password is already set. Please use the reset password flow if you need to change it." });
        }

        // VALIDATION: Same as schema regex
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: "Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, and 1 number" });
        }

        // HASH AND SAVE
        // The User model has a pre-save hook for hashing, but it usually checks if isModified('password')
        // Let's explicitly set it and save
        user.password = password;
        await user.save();

        res.status(200).json({ message: "Password set successfully! You can now log in with your email and password as well." });
    } catch (error) {
        console.error("Set initial password error:", error);
        next(error);
    }
};
