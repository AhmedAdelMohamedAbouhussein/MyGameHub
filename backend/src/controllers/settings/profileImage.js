import userModel from "../../models/User.js";
import { processAndUploadImage, deleteImageByUrl } from "../../utils/imageUpload.js";

export async function profileImage(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const userId = req.session.userId;
        if (!userId) {
            return res.status(400).json({ error: "User ID not provided" });
        }

        // Find the user first
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Delete old picture in the background — don't block the upload
        const oldPicture = user.profilePicture;

        // Process and upload new image
        const result = await processAndUploadImage(req.file.buffer, "avatars", {
            width: 240,
            height: 240,
            fit: 'cover',
            position: 'centre'
        });

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { profilePicture: result.secure_url },
            { new: true }
        );

        // Delete old picture only after new one is safely uploaded
        if (oldPicture) {
            deleteImageByUrl(oldPicture, "avatars").catch(() => {});
        }

        res.json({
            message: "Profile image uploaded successfully",
            profilePicture: updatedUser.profilePicture,
        });
    } catch (err) {
        next(err);
    }
}
