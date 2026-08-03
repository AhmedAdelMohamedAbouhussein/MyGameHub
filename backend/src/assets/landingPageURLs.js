// Static fallback game data used when RAWG API is unavailable.
// Format matches RAWG's /api/games response shape: { id, name, background_image }
// IDs are real RAWG game IDs — navigating to /games/:id will work once RAWG is back.
// Images use Steam's CDN (steamcdn-a.akamaihd.net) — already whitelisted in nginx CSP img-src.
const STEAM_COVER = (appId) =>
    `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/library_600x900_2x.jpg`;

const gameImages = [
    {
        id: 28,
        name: "Red Dead Redemption 2",
        background_image: STEAM_COVER(1174180)
    },
    {
        id: 41494,
        name: "Cyberpunk 2077",
        background_image: STEAM_COVER(1091500)
    },
    {
        id: 326243,
        name: "Elden Ring",
        background_image: STEAM_COVER(1245620)
    },
    {
        id: 3328,
        name: "The Witcher 3: Wild Hunt",
        background_image: STEAM_COVER(292030)
    },
    {
        id: 58134,
        name: "God of War (2018)",
        background_image: STEAM_COVER(1593500)
    },
    {
        id: 32022,
        name: "Sekiro: Shadows Die Twice",
        background_image: STEAM_COVER(814380)
    },
    {
        id: 812966,
        name: "Hogwarts Legacy",
        background_image: STEAM_COVER(990080)
    },
    {
        id: 37382,
        name: "Monster Hunter: World",
        background_image: STEAM_COVER(582010)
    },
    {
        id: 901561,
        name: "Resident Evil 4 Remake",
        background_image: STEAM_COVER(2050650)
    },
    {
        id: 730510,
        name: "Starfield",
        background_image: STEAM_COVER(1716740)
    },
    {
        id: 4282,
        name: "Tom Clancy's Rainbow Six Siege",
        background_image: STEAM_COVER(359550)
    },
    {
        id: 5679,
        name: "The Elder Scrolls V: Skyrim",
        background_image: STEAM_COVER(489830)
    },
    {
        id: 4200,
        name: "Portal 2",
        background_image: STEAM_COVER(620)
    },
    {
        id: 12020,
        name: "Left 4 Dead 2",
        background_image: STEAM_COVER(550)
    },
    {
        id: 477120,
        name: "Assassin's Creed Valhalla",
        background_image: STEAM_COVER(2208920)
    },
];

export default gameImages;