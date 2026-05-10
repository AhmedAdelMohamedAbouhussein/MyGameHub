import React from 'react';
import '../PrivacyPage/PrivacyPage.css';

const TermsPage = () => {
    const lastUpdated = "May 10, 2026";
    const supportEmail = "ahmedadelabouhussein333@gmail.com";

    return (
        <div className="privacy-container">
            <div className="privacy-card">
                <header className="privacy-header">
                    <h1>Terms of Service</h1>
                    <p className="last-updated">Last Updated: {lastUpdated}</p>
                </header>

                <nav className="privacy-toc">
                    <h2>Table of Contents</h2>
                    <ul>
                        <li><a href="#acceptance">1. Acceptance of Terms</a></li>
                        <li><a href="#account">2. Account Registration</a></li>
                        <li><a href="#platform-linking">3. Third-Party Platform Linking</a></li>
                        <li><a href="#acceptable-use">4. Acceptable Use</a></li>
                        <li><a href="#intellectual-property">5. Intellectual Property</a></li>
                        <li><a href="#user-content">6. User Content</a></li>
                        <li><a href="#disclaimers">7. Disclaimers & Limitations</a></li>
                        <li><a href="#termination">8. Account Termination</a></li>
                        <li><a href="#modifications">9. Modifications to Terms</a></li>
                        <li><a href="#governing-law">10. Governing Law</a></li>
                        <li><a href="#contact">11. Contact Information</a></li>
                    </ul>
                </nav>

                <section id="acceptance" className="privacy-section">
                    <h2>1. Acceptance of Terms</h2>
                    <p>By accessing or using GameHub (https://my-gamehub.com), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use the service. These Terms constitute a legally binding agreement between you ("User") and GameHub ("we," "our," or "us").</p>
                </section>

                <section id="account" className="privacy-section">
                    <h2>2. Account Registration</h2>
                    <p>When creating a GameHub account, you agree to:</p>
                    <ul>
                        <li><strong>Accurate Information:</strong> Provide truthful, current, and complete registration information.</li>
                        <li><strong>Account Security:</strong> Maintain the confidentiality of your password and accept responsibility for all activities that occur under your account.</li>
                        <li><strong>One Account Per User:</strong> You may not create multiple accounts for the purpose of abusing platform features, manipulating community interactions, or circumventing restrictions.</li>
                        <li><strong>Prompt Notification:</strong> Notify us immediately of any unauthorized use of your account or any other security breach.</li>
                    </ul>
                </section>

                <section id="platform-linking" className="privacy-section">
                    <h2>3. Third-Party Platform Linking</h2>
                    <p>GameHub allows you to optionally connect external gaming platforms. By linking a platform, you acknowledge the following:</p>

                    <h3>A. Steam, Xbox Live & PlayStation Network (PSN)</h3>
                    <ul>
                        <li>Linking these platforms synchronizes your game library, achievements, playtime data, and friends list with GameHub.</li>
                        <li>We store encrypted OAuth refresh tokens solely for Xbox and PSN to maintain synchronization.</li>
                        <li>You can disconnect any platform at any time, which immediately halts further data synchronization.</li>
                    </ul>

                    <h3>B. Epic Games</h3>
                    <div className="alert-box">
                        <strong>Important:</strong> Epic Games integration is limited to public profile and friends list data only. GameHub does not access Epic Games library or achievement data, and does not store any Epic Games authentication tokens.
                    </div>

                    <h3>C. Your Responsibilities</h3>
                    <ul>
                        <li>You must have the right to link any third-party account you connect to GameHub.</li>
                        <li>You are responsible for complying with the terms of service of each third-party platform.</li>
                        <li>GameHub is not responsible for any actions taken by third-party platforms regarding your account.</li>
                    </ul>
                </section>

                <section id="acceptable-use" className="privacy-section">
                    <h2>4. Acceptable Use</h2>
                    <p>You agree not to:</p>
                    <ul>
                        <li>Use GameHub for any unlawful purpose or in violation of any applicable laws.</li>
                        <li>Attempt to gain unauthorized access to any part of the service, other user accounts, or our infrastructure.</li>
                        <li>Interfere with or disrupt the integrity or performance of the service.</li>
                        <li>Upload malicious content, including viruses, malware, or harmful scripts.</li>
                        <li>Harass, abuse, or threaten other users through GameHub's community or social features.</li>
                        <li>Scrape, crawl, or use automated means to extract data from GameHub without explicit permission.</li>
                        <li>Impersonate another person or entity, or misrepresent your affiliation with any person or entity.</li>
                    </ul>
                </section>

                <section id="intellectual-property" className="privacy-section">
                    <h2>5. Intellectual Property</h2>
                    <ul>
                        <li><strong>GameHub Content:</strong> All content, features, and functionality of GameHub (including but not limited to design, code, text, and graphics) are owned by GameHub and are protected by intellectual property laws.</li>
                        <li><strong>Third-Party Content:</strong> Game titles, cover art, achievement data, and platform logos are the property of their respective owners (Valve, Microsoft, Sony, Epic Games). GameHub displays this data under fair use for the purpose of providing an aggregation service.</li>
                        <li><strong>Open Source:</strong> GameHub's source code is publicly available. Usage of the codebase is subject to the license terms specified in the project repository.</li>
                    </ul>
                </section>

                <section id="user-content" className="privacy-section">
                    <h2>6. User Content</h2>
                    <p>You may upload content such as profile pictures and background images. By uploading content, you:</p>
                    <ul>
                        <li>Grant GameHub a non-exclusive, worldwide license to display this content as part of your public profile.</li>
                        <li>Confirm that you own or have the necessary rights to the content you upload.</li>
                        <li>Agree not to upload content that is offensive, illegal, or infringes on the rights of others.</li>
                    </ul>
                    <p>We reserve the right to remove any user content that violates these Terms without prior notice.</p>
                </section>

                <section id="disclaimers" className="privacy-section">
                    <h2>7. Disclaimers & Limitations</h2>
                    <ul>
                        <li><strong>As-Is Service:</strong> GameHub is provided "as is" and "as available" without warranties of any kind, either express or implied.</li>
                        <li><strong>Data Accuracy:</strong> While we strive to keep your synced data accurate, we cannot guarantee that third-party API data (game libraries, achievements, friends lists) will always be complete or up-to-date.</li>
                        <li><strong>Service Availability:</strong> We do not guarantee uninterrupted or error-free operation of the service. Scheduled maintenance, infrastructure updates, or third-party API outages may temporarily affect availability.</li>
                        <li><strong>Limitation of Liability:</strong> To the maximum extent permitted by law, GameHub shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.</li>
                    </ul>
                </section>

                <section id="termination" className="privacy-section">
                    <h2>8. Account Termination</h2>
                    <ul>
                        <li><strong>By You:</strong> You may delete your account at any time through the Settings page. Upon deletion, all your data (profile, library, achievements, friendships, and uploaded assets) will be permanently purged from our systems.</li>
                        <li><strong>By Us:</strong> We reserve the right to suspend or terminate your account if you violate these Terms, engage in abusive behavior, or compromise the security of the platform. We will make reasonable efforts to notify you before taking such action.</li>
                    </ul>
                </section>

                <section id="modifications" className="privacy-section">
                    <h2>9. Modifications to Terms</h2>
                    <p>We may update these Terms from time to time. When we make significant changes, we will update the "Last Updated" date at the top of this page. Your continued use of GameHub after changes are posted constitutes acceptance of the revised Terms.</p>
                </section>

                <section id="governing-law" className="privacy-section">
                    <h2>10. Governing Law</h2>
                    <p>These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising from these Terms or your use of GameHub shall be resolved through good-faith negotiation before pursuing formal legal proceedings.</p>
                </section>

                <section id="contact" className="privacy-section">
                    <h2>11. Contact Information</h2>
                    <p>For questions about these Terms of Service, please contact us at:</p>
                    <div className="contact-card">
                        <strong>Email:</strong> <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
                    </div>
                </section>

                <footer className="privacy-footer">
                    <p>&copy; 2026 GameHub. All rights reserved. Support: {supportEmail}</p>
                </footer>
            </div>
        </div>
    );
};

export default TermsPage;
