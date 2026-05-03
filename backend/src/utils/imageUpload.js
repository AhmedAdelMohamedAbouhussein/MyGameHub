import { v2 as cloudinary } from "cloudinary";
import config from "../config/env.js";
import sharp from "sharp";
import axios from "axios";
import logger from "./logger.js";

// Configure Cloudinary
cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
});

// Shared image settings
const AVATAR_SIZE = 240;
const AVATAR_QUALITY = 55;

const DEFAULT_QUALITY = 70;
const DEFAULT_WIDTH = 1920;

/**
 * Upload an image buffer directly to Cloudinary.
 */
export const processAndUploadImage = async (fileBuffer, folder) => {
    try {
        let sharpInstance = sharp(fileBuffer);

        if (folder === "avatars") {
            sharpInstance = sharpInstance.resize({
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                fit: "cover",
                position: "centre"
            }).webp({
                quality: AVATAR_QUALITY,
                effort: 4,
                chromaSubsampling: "4:2:0"
            });
        } else {
            sharpInstance = sharpInstance.resize({
                width: DEFAULT_WIDTH,
                fit: "inside",
                withoutEnlargement: true
            }).webp({
                quality: DEFAULT_QUALITY,
                effort: 4,
                chromaSubsampling: "4:2:0"
            });
        }

        const processedBuffer = await sharpInstance.toBuffer();

        return new Promise((resolve, reject) => {
            const uploadOptions = {
                folder,
                resource_type: "image",
                transformation: [
                    { quality: "auto:eco", fetch_format: "auto" }
                ]
            };

            const stream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                    if (result) resolve(result);
                    else reject(error);
                }
            );

            stream.end(processedBuffer);
        });

    } catch (error) {
        logger.error({ err: error }, 'processAndUploadImage error');
        throw error;
    }
};

/**
 * Upload an image from a URL directly to Cloudinary.
 */
export const uploadImageFromUrl = async (url, folder, publicId = null) => {
    if (!url) return null;

    try {
        const response = await axios.get(url, { responseType: "arraybuffer" });
        const fileBuffer = Buffer.from(response.data);

        let sharpInstance = sharp(fileBuffer);

        if (folder === "avatars") {
            sharpInstance = sharpInstance.resize({
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                fit: "cover",
                position: "centre"
            }).webp({
                quality: AVATAR_QUALITY,
                effort: 4,
                chromaSubsampling: "4:2:0"
            });
        } else {
            sharpInstance = sharpInstance.resize({
                width: DEFAULT_WIDTH,
                fit: "inside",
                withoutEnlargement: true
            }).webp({
                quality: DEFAULT_QUALITY,
                effort: 4,
                chromaSubsampling: "4:2:0"
            });
        }

        const processedBuffer = await sharpInstance.toBuffer();

        return new Promise((resolve, reject) => {
            const uploadOptions = {
                folder,
                resource_type: "image",
                transformation: [
                    { quality: "auto:eco", fetch_format: "auto" }
                ]
            };

            if (publicId) {
                uploadOptions.public_id = publicId;
                uploadOptions.overwrite = true;
                uploadOptions.invalidate = true;
            }

            const stream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                    if (result) resolve(result);
                    else reject(error);
                }
            );

            stream.end(processedBuffer);
        });

    } catch (err) {
        logger.error({ err, folder }, 'uploadImageFromUrl error');
        return null;
    }
};

/**
 * Delete image from Cloudinary by URL.
 */
export const deleteImageByUrl = async (url) => {
    if (!url || typeof url !== "string") return;

    try {
        const parts = url.split("/upload/")[1];
        if (!parts) return;

        const withoutVersion = parts.replace(/^v\d+\//, "");
        const publicId = withoutVersion.split(".")[0];

        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        logger.error({ err }, 'deleteImageByUrl error');
    }
};