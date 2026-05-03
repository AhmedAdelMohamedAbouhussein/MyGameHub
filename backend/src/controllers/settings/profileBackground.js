import userModel from "../../models/User.js";
import { processAndUploadImage, deleteImageByUrl } from "../../utils/imageUpload.js";

export async function profileBackground(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const userId = req.session.userId;
        if (!userId) {
            return res.status(400).json({ error: "User ID not provided" });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Delete old background if exists
        if (user.profileBackground) {
            await deleteImageByUrl(user.profileBackground, "profile_backgrounds");
        }

        // Process and upload new background
        const result = await processAndUploadImage(req.file.buffer, "profile_backgrounds", {
            width: 1920,
            withoutEnlargement: true,
            fit: 'inside'
        });

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { profileBackground: result.secure_url },
            { new: true }
        );

        res.json({
            message: "Profile background uploaded successfully",
            profileBackground: updatedUser.profileBackground,
        });
    } catch (err) {
        next(err);
    }
}
