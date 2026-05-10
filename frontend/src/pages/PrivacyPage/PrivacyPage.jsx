import React from 'react';
import './PrivacyPage.css';

const PrivacyPage = () => {
    const lastUpdated = "May 10, 2026";
    const supportEmail = "ahmedadelabouhussein333@gmail.com";

    return (
        <div className="privacy-container">
            <div className="privacy-card">
                <header className="privacy-header">
                    <h1>Privacy Policy</h1>
                    <p className="last-updated">Last Updated: {lastUpdated}</p>
                </header>

                <nav className="privacy-toc">
                    <h2>Table of Contents</h2>
                    <ul>
                        <li><a href="#introduction">1. Introduction</a></li>
                        <li><a href="#account-security">2. Account Security</a></li>
                        <li><a href="#platform-sync">3. Multi-Platform Data Synchronization</a></li>
                        <li><a href="#third-party-auth">4. Third-Party Authorization & Access Tokens</a></li>
                        <li><a href="#data-protection">5. Data Protection & Encryption</a></li>
                        <li><a href="#logs">6. System Monitoring & Logging</a></li>
                        <li><a href="#cookies">7. Cookies & Sessions</a></li>
                        <li><a href="#storage">8. Infrastructure</a></li>
                        <li><a href="#sharing">9. Data Sharing Policy</a></li>
                        <li><a href="#control">10. User Control & Data Deletion</a></li>
                        <li><a href="#contact">11. Contact Information</a></li>
                    </ul>
                </nav>

                <section id="introduction" className="privacy-section">
                    <h2>1. Introduction</h2>
                    <p>Welcome to GameHub ("we," "our," or "us"). We are dedicated to protecting your personal information and maintaining your trust. This Privacy Policy outlines how we handle your data when you use our services at https://my-gamehub.com. We prioritize transparency and security in every aspect of our platform.</p>
                </section>

                <section id="account-security" className="privacy-section">
                    <h2>2. Account Security</h2>
                    <p>Your GameHub account is protected using industry-standard security measures:</p>
                    <ul>
                        <li><strong>One-Way Hashing:</strong> We never store passwords in plain text. We utilize advanced cryptographic hashing algorithms to ensure your credentials remain irreversible and secure.</li>
                        <li><strong>Salted Credentials:</strong> Each hashed credential is uniquely salted to prevent large-scale data reversal attacks.</li>
                    </ul>
                </section>

                <section id="platform-sync" className="privacy-section">
                    <h2>3. Multi-Platform Data Synchronization</h2>
                    <p>GameHub allows you to synchronize your gaming profile with various third-party platforms. The data collected is limited based on platform permissions:</p>
                    
                    <h3>A. Steam, Xbox Live & PlayStation Network (PSN)</h3>
                    <ul>
                        <li><strong>Gaming Library:</strong> Titles of owned games and unique game identifiers.</li>
                        <li><strong>Engagement Metrics:</strong> Total hours played, last played dates, and completion percentages.</li>
                        <li><strong>Achievements:</strong> Lists of earned rewards, unlock dates, and progress milestones.</li>
                        <li><strong>Social Data:</strong> Public display names and friends list metadata to help you connect with your gaming circle.</li>
                    </ul>

                    <h3>B. Epic Games</h3>
                    <div className="alert-box">
                        <strong>Epic Games Compliance:</strong> GameHub is a separate service and does <u>not</u> use Epic Games for authentication. Epic Games data access is limited to publicly available profile information and friends list data obtained through official Epic Games APIs, based on user authorization.
                    </div>
                    <ul>
                        <li><strong>Profile Data:</strong> Public display name and unique account identifier.</li>
                        <li><strong>Social Data:</strong> Friends list metadata for community integration.</li>
                    </ul>
                </section>

                <section id="third-party-auth" className="privacy-section">
                    <h2>4. Third-Party Authorization & Access Tokens</h2>
                    <p>
                        GameHub connects to third-party gaming platforms, including Xbox and PlayStation Network (PSN),
                        through official OAuth authorization flows.
                    </p>
                    <ul>
                        <li>
                            All connections to third-party platforms are performed only after explicit user consent through official authorization flows.
                        </li>
                        <li>
                            We do not access any third-party data without explicit user consent.
                        </li>
                        <li>
                            We securely store OAuth refresh tokens only for Xbox and PlayStation Network connections.
                        </li>
                        <li>
                            These tokens are encrypted at rest and are used exclusively to maintain authorized synchronization sessions and refresh access tokens where required.
                        </li>
                        <li>
                            We do not store authentication credentials, passwords, or payment information for any platform.
                        </li>
                        <li>
                            Access is strictly limited to data explicitly authorized by the user during connection.
                        </li>
                    </ul>
                    <p>
                        Refresh tokens are used only for maintaining synchronization with Xbox and PlayStation Network services and cannot be used to access any unrelated account data.
                    </p>
                </section>

                <section id="data-protection" className="privacy-section">
                    <h2>5. Data Protection & Encryption</h2>
                    <p>To provide automated synchronization, we store connection tokens with robust protection:</p>
                    <ul>
                        <li>
                            <strong>Token Security:</strong> OAuth refresh tokens for Xbox and PlayStation Network are encrypted using AES-256 encryption and stored securely in our backend systems.
                        </li>
                        <li>
                            <strong>Encryption Precision:</strong> Encryption is applied to sensitive stored tokens and connection data to ensure maximum integrity.
                        </li>
                        <li>
                            <strong>Access Monitoring:</strong> All access to third-party APIs is logged and monitored for security and abuse prevention.
                        </li>
                        <li>
                            <strong>No Epic token storage:</strong> We do not store any authentication tokens or credentials related to Epic Games.
                        </li>
                        <li><strong>Secure Key Management:</strong> Encryption keys are managed in isolated, secure environments, separate from our application databases.</li>
                    </ul>
                </section>

                <section id="logs" className="privacy-section">
                    <h2>6. System Monitoring & Logging</h2>
                    <p>We monitor our systems for security and performance. To protect your identity:</p>
                    <ul>
                        <li><strong>Anonymized Logging:</strong> Our logs are designed to exclude personally identifiable information. We use unique, non-reversible identifiers to track system events without exposing user identities.</li>
                    </ul>
                </section>

                <section id="cookies" className="privacy-section">
                    <h2>7. Cookies & Sessions</h2>
                    <p>We use essential cookies to maintain your login session. These are secure, "HttpOnly" cookies that protect against common web vulnerabilities. We do not use cookies for third-party advertising or tracking.</p>
                </section>

                <section id="storage" className="privacy-section">
                    <h2>8. Infrastructure</h2>
                    <p>Your data is stored securely on Amazon Web Services (AWS) in highly protected data centers. We maintain strict access controls and utilize encrypted connections (TLS/SSL) for all data in transit.</p>
                </section>

                <section id="sharing" className="privacy-section">
                    <h2>9. Data Sharing Policy</h2>
                    <p><strong>Zero-Selling Policy:</strong> We do not sell, rent, or use your data for advertising or behavioral profiling. Data is only processed through our secure infrastructure providers solely to deliver the GameHub service.</p>
                </section>

                <section id="control" className="privacy-section">
                    <h2>10. User Control & Data Deletion</h2>
                    <p>You have full autonomy over your information:</p>
                    <ul>
                        <li><strong>Service Disconnection:</strong> You can disconnect any gaming platform at any time, which immediately halts any further data synchronization.</li>
                        <li><strong>Permanent Deletion:</strong> If you choose to delete your GameHub account, all associated gaming data, profile assets, and account information are permanently purged from our active databases.</li>
                    </ul>
                </section>

                <section id="contact" className="privacy-section">
                    <h2>11. Contact Information</h2>
                    <p>For any privacy-related questions, please contact us at:</p>
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

export default PrivacyPage;
