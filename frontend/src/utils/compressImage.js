/**
 * Compress an image File/Blob on the client using Canvas before uploading.
 * This cuts typical phone photos from ~4-5 MB down to ~150-400 KB.
 *
 * @param {File|Blob} file       - The raw file from the <input>
 * @param {number}    maxWidth   - Maximum output width in px (default 1920)
 * @param {number}    maxHeight  - Maximum output height in px (default 1080)
 * @param {number}    quality    - JPEG quality 0–1 (default 0.82)
 * @returns {Promise<Blob>}      - Compressed image blob (image/jpeg)
 */
export async function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.82) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            let { width, height } = img;

            // Scale down proportionally if over the max
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas toBlob failed'));
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}
