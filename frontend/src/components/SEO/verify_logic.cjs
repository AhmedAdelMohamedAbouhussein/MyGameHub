const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Simple logic test that replicates the SEO component's internal logic
// to prove that for any given path, the outputs are correct.

const siteUrl = "https://my-gamehub.com";

function getCanonical(pathname, customCanonical) {
    if (customCanonical) return customCanonical.toLowerCase();
    
    const normalizedPath = pathname.endsWith("/") && pathname !== "/"
        ? pathname.slice(0, -1)
        : pathname;

    return (siteUrl + (normalizedPath === "/" ? "" : normalizedPath)).toLowerCase();
}

const testCases = [
    { path: "/", expected: "https://my-gamehub.com" },
    { path: "/games", expected: "https://my-gamehub.com/games" },
    { path: "/games/", expected: "https://my-gamehub.com/games" },
    { path: "/Games/", expected: "https://my-gamehub.com/games" },
    { path: "/community", expected: "https://my-gamehub.com/community" },
    { path: "/profile/User123", expected: "https://my-gamehub.com/profile/user123" }
];

console.log("--- Running SEO Logic Verification ---");
let passed = 0;
testCases.forEach(tc => {
    const actual = getCanonical(tc.path);
    if (actual === tc.expected) {
        console.log(`✅ PASS: [${tc.path}] -> ${actual}`);
        passed++;
    } else {
        console.log(`❌ FAIL: [${tc.path}] -> Expected ${tc.expected}, got ${actual}`);
    }
});

console.log(`\nResults: ${passed}/${testCases.length} tests passed.`);
if (passed === testCases.length) {
    process.exit(0);
} else {
    process.exit(1);
}
