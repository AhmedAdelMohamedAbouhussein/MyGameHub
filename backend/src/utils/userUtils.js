import mongoose from 'mongoose';
import { nanoid } from "nanoid";

export const generatePublicID = async function (name) {
    let isUnique = false;
    let newID;

    while (!isUnique) {
        const cleanName = (name || "User").replace(/\s+/g, "");
        const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5-digit number
        newID = `${cleanName}#${randomDigits}`;

        const existing = await mongoose.models.User.findOne({ publicID: newID });
        if (!existing) isUnique = true;
    }

    return newID;
};

export const generateProfileHandle = async function () {
    let isUnique = false;
    let handle;

    while (!isUnique) {
        handle = nanoid(10); // e.g. "V1StGXR8_Z"
        const existing = await mongoose.models.User.findOne({ profileHandle: handle });
        if (!existing) isUnique = true;
    }

    return handle;
};
