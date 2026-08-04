/**
 * Optimizes image URLs for bandwidth savings.
 * - RAWG CDN: uses their built-in resize endpoint
 * - Steam CDN (akamaihd): downgrades 2x library art to 1x for smaller display widths
 */
export const optimizeImage = (url, width = 640) => {
    if (!url || typeof url !== 'string') return url;

    // ── RAWG CDN ─────────────────────────────────────────────────────────────
    if (url.includes('media/games/')) {
        return url.replace('media/games/', `media/resize/${width}/-/games/`);
    }
    if (url.includes('media/screenshots/')) {
        return url.replace('media/screenshots/', `media/resize/${width}/-/screenshots/`);
    }
    if (url.includes('media/thumbnails/')) {
        return url.replace('media/thumbnails/', `media/resize/${width}/-/thumbnails/`);
    }

    // ── Steam CDN (akamaihd) ─────────────────────────────────────────────────
    // library_600x900_2x.jpg is 1200x1800 — downgrade to 600x900 for small slots
    if (url.includes('steamcdn-a.akamaihd.net') && url.includes('library_600x900_2x.jpg') && width <= 600) {
        return url.replace('library_600x900_2x.jpg', 'library_600x900.jpg');
    }

    return url;
};

