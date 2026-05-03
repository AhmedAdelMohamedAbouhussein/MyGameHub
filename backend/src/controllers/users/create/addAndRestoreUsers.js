
import userModel from '../../../models/User.js'
import config from '../../../config/env.js'
import { sendOtpToUser } from '../../nodeMailer/sendOtp.js'

// @desc  
// @route  POST /api/users/adduser
export const addUser = async (req, res, next) => {
    try {
        const { email, name, password } = req.body;

        if (!name) {
            const err = new Error("Name is required");
            err.status = 400;
            return next(err);
        }
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            const error = new Error("Invalid email format.");
            error.status = 400;
            return next(error);
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            const error = new Error("Password must be at least 8 characters long, contain one uppercase letter, one lowercase letter, and one number.");
            error.status = 400;
            return next(error);
        }

        const APP_BACKEND_URL = config.appUrl

        // Check if an active user already exists
        const activeUser = await userModel.findOne({ email, isDeleted: false });
        if (activeUser) {
            const err = new Error("User with this email already exists");
            err.status = 409;
            return next(err);
        }

        // Check if a deleted user exists
        const deletedUser = await userModel.findOne({ email, isDeleted: true });
        if (deletedUser) {
            return res.status(409).json({
                message:
                    "This email is associated with a deleted account. Would you like to restore your old account or permanently delete it?",
                restoreLink: `/verify?userId=${deletedUser._id}&email=${encodeURIComponent(deletedUser.email)}&purpose=restore_account`,
                permanentDelete: `/verify?userId=${deletedUser._id}&email=${encodeURIComponent(deletedUser.email)}&purpose=permanently_delete_account`,
            });
        }

        // Otherwise, create new user
        const newUser = await userModel.create({
            email,
            name,
            password,
        });

        await sendOtpToUser({ userId: newUser._id, email: newUser.email, purpose: "email_verification" });

        res.status(201).json({ message: "User signed up successfully, verification OTP sent", userId: newUser._id });

    }
    catch (error) {
        next(error);
    }
}