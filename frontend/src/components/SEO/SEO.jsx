import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

/**
 * SEO Component to manage dynamic metadata
 * @param {string} title - Page title
 * @param {string} description - Meta description
 * @param {string} canonical - Optional custom canonical URL
 */
const SEO = ({ title, description, canonical, image }) => {
    const { pathname } = useLocation();
    const siteUrl = "https://my-gamehub.com";
    const fullTitle = title ? `${title} | My GameHub` : "My GameHub — Track Games, Achievements & Live Price Drops";
    const defaultDescription = "Unify your Steam, Xbox, PlayStation, and Epic Games library. Track achievements, monitor price drops, and manage your wishlist in one dashboard.";
    const metaDescription = description || defaultDescription;
    
    // Normalize path to avoid trailing slash issues and ensure lowercase for canonical
    const normalizedPath = pathname.endsWith("/") && pathname !== "/"
        ? pathname.slice(0, -1)
        : pathname;

    const fullCanonical = (canonical || `${siteUrl}${normalizedPath === "/" ? "" : normalizedPath}`).toLowerCase();
    const defaultImage = "https://res.cloudinary.com/dvbmaonhc/image/upload/v1778437307/My_GameHub_Logo_real_black_ccnq4t.png";
    const ogImage = image || defaultImage;

    return (
        <Helmet>
            {/* Standard metadata */}
            <title>{fullTitle}</title>
            <meta name="description" content={metaDescription} />
            <link rel="canonical" href={fullCanonical} />
            <meta name="robots" content="index, follow" />

            {/* Open Graph */}
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={metaDescription} />
            <meta property="og:url" content={fullCanonical} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="My GameHub" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={metaDescription} />
            <meta name="twitter:image" content={ogImage} />
        </Helmet>
    );
};

export default SEO;
