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

        // Stash old URL before overwriting
        const oldBackground = user.profileBackground;

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

        // Delete old background only after new one is safely uploaded
        if (oldBackground) {
            deleteImageByUrl(oldBackground, "profile_backgrounds").catch(() => {});
        }

        res.json({
            message: "Profile background uploaded successfully",
            profileBackground: updatedUser.profileBackground,
        });
    } catch (err) {
        next(err);
    }
}
