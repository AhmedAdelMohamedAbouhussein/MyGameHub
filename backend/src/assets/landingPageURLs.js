// Static fallback game data used when RAWG API is unavailable.
// Format matches RAWG's /api/games response shape: { id, name, background_image }
// IDs are real RAWG game IDs — navigating to /games/:id will work once RAWG is back.
// Images are proxied through Cloudinary fetch API so they pass the frontend CSP (img-src allows res.cloudinary.com).
const CDN = (url) => `https://res.cloudinary.com/dvbmaonhc/image/fetch/${encodeURIComponent(url)}`;

const gameImages = [
    {
        id: 28,
        name: "Red Dead Redemption 2",
        background_image: CDN("https://i.pinimg.com/736x/25/68/01/256801b2f79a64c4fb33bdd82151b52d.jpg")
    },
    {
        id: 4200,
        name: "Portal 2",
        background_image: CDN("https://4kwallpapers.com/images/wallpapers/marvels-spider-man-1080x1920-11609.jpeg")
    },
    {
        id: 58134,
        name: "God of War (2018)",
        background_image: CDN("https://m.media-amazon.com/images/M/MV5BNjJiNTFhY2QtNzZkYi00MDNiLWEzNGEtNWE1NzBkOWIxNmY5XkEyXkFqcGc@._V1_.jpg")
    },
    {
        id: 3328,
        name: "The Witcher 3: Wild Hunt",
        background_image: CDN("https://i.pinimg.com/736x/5d/8a/41/5d8a41501af6aab5d2e754de44f58834.jpg")
    },
    {
        id: 4282,
        name: "Tom Clancy's Rainbow Six Siege",
        background_image: CDN("https://m.media-amazon.com/images/I/61BlQmnK8XS._UF894,1000_QL80_.jpg")
    },
    {
        id: 326243,
        name: "Elden Ring",
        background_image: CDN("https://cdna.artstation.com/p/assets/images/images/043/897/516/large/seed-seven-twodots-seedseven-eldenring-1.jpg?1638544010")
    },
    {
        id: 41494,
        name: "Cyberpunk 2077",
        background_image: CDN("https://media.printler.com/media/photo/152784.jpg?rmode=crop&width=725&height=1024")
    },
    {
        id: 5679,
        name: "The Elder Scrolls V: Skyrim",
        background_image: CDN("https://pbs.twimg.com/media/DXoWn1TUQAAgfQn.jpg")
    },
    {
        id: 12020,
        name: "Left 4 Dead 2",
        background_image: CDN("https://upload.wikimedia.org/wikipedia/en/2/2f/Forza_7_art.jpg")
    },
    {
        id: 32022,
        name: "Sekiro: Shadows Die Twice",
        background_image: CDN("https://upload.wikimedia.org/wikipedia/en/6/6e/Sekiro_art.jpg")
    },
    {
        id: 477120,
        name: "Assassin's Creed Valhalla",
        background_image: CDN("https://media.diy.com/is/image/KingfisherDigital/assassin-s-creed-valhalla-game-art-61-x-91-5cm-maxi-poster~5028486484577_01c_MP?$MOB_PREV$&$width=1200&$height=1200")
    },
    {
        id: 812966,
        name: "Hogwarts Legacy",
        background_image: CDN("https://m.media-amazon.com/images/I/81A9m2D-mVL._UF894,1000_QL80_.jpg")
    },
    {
        id: 37382,
        name: "Monster Hunter: World",
        background_image: CDN("https://cdn2.steamgriddb.com/thumb/4b3dd8900b9635955aeefd0d8e5e3da5.jpg")
    },
    {
        id: 901561,
        name: "Resident Evil 4 Remake",
        background_image: CDN("https://m.media-amazon.com/images/I/61nNH31Cy5L.jpg")
    },
    {
        id: 730510,
        name: "Starfield",
        background_image: CDN("https://upload.wikimedia.org/wikipedia/en/5/5c/Starfield_logo.png")
    },
];

export default gameImages;