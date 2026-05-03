import dotenv from 'dotenv';
dotenv.config(); // load env variables once

export default
    {
        frontendUrl: process.env.APP_FRONTEND_URL,
        nodeEnv: process.env.NODE_ENV,
        sessionSecret: process.env.SESSION_SECRET,
        port: process.env.PORT,
        appUrl: process.env.APP_BACKEND_URL,
        mongoUri: process.env.MONGO_ATLAS_URL || process.env.LOCAL_MONGO_URL,
        xboxRedirectURL: process.env.APP_BACKEND_URL + process.env.XBOX_REDIRECT_URI,
        RAWG_API_KEY: process.env.RAWG_API_KEY,
        personalEmail: process.env.PERSONAL_EMAIL,

        mongoAtlas:
        {
            url: process.env.MONGO_ATLAS_URL,
            username: process.env.MONGO_ATLAS_USERNAME,
            password: process.env.MONGO_ATLAS_PASSWORD,
        },

        google:
        {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            youtubeApiKey: process.env.YOUTUBE_API_KEY,
        },
        steam:
        {
            apiKey: process.env.STEAM_API_KEY,
            steamId: process.env.STEAM_ID,
        },
        iTAD:
        {
            apiKey: process.env.ISTHEREANYDEAL_API_KEY,
            clientId: process.env.ISTHEREANYDEAL_CLIENT_ID,
            clientSecret: process.env.ISTHEREANYDEAL_CLIENT_SECRET,
        },
        rawg:
        {
            apiKey: process.env.RAWG_API_KEY,
        },
        security:
        {
            algorithm: process.env.ALGORITHM,
            encryptionKey: process.env.ENCRYPTION_KEY,
            ivLength: parseInt(process.env.IV_LENGTH, 10),
            bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10),
        },
        gmail:
        {
            gmail: process.env.GMAIL,
            password: process.env.GMAIL_PASSWORD
        },
        azure:
        {
            clientId: process.env.AZURE_ClIENT_ID,
            tenantId: process.env.AZURE_TENANT_ID,
            clientSecret: process.env.AZURE_ClIENT_SECRET,
        },
        cloudinary:
        {
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
            apiSecret: process.env.CLOUDINARY_API_SECRET,
        },
        epic:
        {
            clientId: process.env.EPIC_CLIENT_ID,
            clientSecret: process.env.EPIC_CLIENT_SECRET,
            REDIRECT_URI: process.env.APP_BACKEND_URL + process.env.EPIC_REDIRECT_URI,
        }
    };