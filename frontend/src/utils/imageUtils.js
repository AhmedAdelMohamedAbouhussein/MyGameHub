/**
 * RAWG API supports dynamic image resizing.
 * This utility transforms a full-size image URL into a resized version to save bandwidth.
 */
export const optimizeImage = (url, width = 640) => {
    if (!url || typeof url !== 'string') return url;

    // Check if it's a RAWG media URL
    if (url.includes('media/games/')) {
        return url.replace('media/games/', `media/resize/${width}/-/games/`);
    }
    if (url.includes('media/screenshots/')) {
        return url.replace('media/screenshots/', `media/resize/${width}/-/screenshots/`);
    }
    if (url.includes('media/thumbnails/')) {
        return url.replace('media/thumbnails/', `media/resize/${width}/-/thumbnails/`);
    }

    return url;
};
