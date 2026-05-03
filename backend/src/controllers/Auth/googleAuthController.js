import { google } from 'googleapis';
import { UserRefreshClient, OAuth2Client } from 'google-auth-library';
import config from '../../config/env.js'
import userModel from '../../models/User.js'

const CI = config.google.clientId;
const CS = config.google.clientSecret;
const oAuth2Client = new OAuth2Client(CI, CS, 'postmessage');

// @desc  get access token from Google to login user
// @route  POST /auth/google/access-token
export const googleLogin = async (req, res, next) => {
    try {
        const rememberMe = Boolean(req.body.rememberMe);

        const ONE_DAY = 1000 * 60 * 60 * 24;
        const SEVEN_DAYS = ONE_DAY * 7;

        const { tokens } = await oAuth2Client.getToken(req.body.code); // exchange code for tokens
        oAuth2Client.setCredentials(tokens); // Set the credentials
        const oauth2 = google.oauth2({
            auth: oAuth2Client,
            version: 'v2',
        });
        // Fetch user info
        const userInfoResponse = await oauth2.userinfo.get();
        const useremail = userInfoResponse.data.email;

        console.log('User Info:', useremail);


        // Check active user
        const user = await userModel.findOne({ email: useremail, isDeleted: false });

        if (user) {
            req.session.userId = user._id;

            req.session.cookie.maxAge = rememberMe ? SEVEN_DAYS : ONE_DAY;

            return req.session.save(err => {
                if (err) {
                    console.error("Session save error:", err);
                    const err = new Error("Failed to save session");
                    return next(err);
                }
                return res.status(200).json({
                    message: "Login successful redirecting to Landing Page......"
                });
            });
        }

        // Check deleted user
        const deletedUser = await userModel.findOne({ email: useremail, isDeleted: true });
        if (deletedUser) {
            return res.status(409).json({
                message:
                    "This email is associated with a deleted account. Would you like to restore your old account or permanently delete it?",
                restoreLink: `${APP_BACKEND_URL}/api/users/${useremail}/restore`,
                permanentDelete: `${APP_BACKEND_URL}/api/users/${useremail}/delete`,
            });
        }

        // No user found at all
        const err = new Error("Invalid Email. Please login if you dont have an account");
        err.status = 404;
        return next(err);

    }
    catch (error) {
        console.error("Google login error:", error.response?.data || error.message || error);
        const err = new Error("Error during Google login")
        return next(err)
    }
}

// @desc  get access token from Google to signup user
// @route  POST /auth/google/signup
export const googleSignup = async (req, res, next) => {
    try {

        const { tokens } = await oAuth2Client.getToken(req.body.code); // exchange code for tokens
        oAuth2Client.setCredentials(tokens); // Set the credentials
        const oauth2 = google.oauth2({
            auth: oAuth2Client,
            version: 'v2',
        });
        // Fetch user info
        const userInfoResponse = await oauth2.userinfo.get();
        const useremail = userInfoResponse.data.email;
        const username = userInfoResponse.data.name;

        // Check if an active user already exists
        const activeUser = await userModel.findOne({ email: useremail, isDeleted: false });
        if (activeUser) {
            const err = new Error("User with this email already exists");
            err.status = 409;
            return next(err);
        }

        // Check if a deleted user exists
        const deletedUser = await userModel.findOne({ email: useremail, isDeleted: true });
        if (deletedUser) {
            // Send a friendly message suggesting restore
            return res.status(409).json({ message: "This email is associated with a deleted account. Would you like to restore your old account or permanently delete it?", restoreLink: `${APP_BACKEND_URL}/api/users/${useremail}/restore`, permanentDelete: `${APP_BACKEND_URL}/api/users/${useremail}/permanentDelete` });
        }

        // Otherwise, create new user
        const newUser = await userModel.create({ name: username, email: useremail, isVerified: true });

        // Log the user in immediately
        req.session.userId = newUser._id;
        req.session.cookie.maxAge = 1000 * 60 * 60 * 24; // 1 day default

        return req.session.save(err => {
            if (err) {
                console.error("Session save error:", err);
                const error = new Error("Failed to save session");
                return next(error);
            }
            res.status(201).json({
                message: "User signed up and logged in successfully!"
            });
        });

    }
    catch (error) {
        console.error("Google login error:", error.response?.data || error.message || error);
        const err = new Error("Error during Google login")
        return next(err)
    }
}