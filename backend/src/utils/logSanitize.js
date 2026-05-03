import { createHmac } from 'crypto';
import config from '../config/env.js';

/**
 * Log sanitization utilities.
 *
 * PII must never appear in raw form in production logs.
 * Use these helpers whenever logging user-identifying data.
 *
 * maskEmail("john.doe@gmail.com")  → "jo***@gmail.com"
 * hashId("76561198012345678")      → "id:a3f8b2c1"  (salted HMAC)
 */

// Read once at module load — fail loudly in production if missing.
const LOG_SALT = config.logSalt;
if (!LOG_SALT) {
    throw new Error('LOG_SALT is not defined');
}

/**
 * Masks an email address for safe logging.
 * Shows the first 2 chars of the local part + domain.
 * @param {string|null|undefined} email
 * @returns {string}
 */
export function maskEmail(email) {
    if (!email || typeof email !== 'string') return '[no-email]';
    const [local, domain] = email.split('@');
    if (!domain) return '[invalid-email]';
    const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
    return `${visible}***@${domain}`;
}

/**
 * Produces a salted HMAC-SHA256 fingerprint of an identifier
 * (Steam ID, PSN ID, Xbox XUID, publicID, etc.) for safe logging.
 *
 * Properties:
 *  - Deterministic: same input + same LOG_SALT → same output (log-correlatable)
 *  - Non-reversible: cannot reconstruct the original ID from the digest
 *  - Salt-protected: even knowing the raw ID, an attacker cannot confirm a
 *    match without the server-side LOG_SALT secret
 *
 * @param {string|number|null|undefined} id
 * @returns {string}  e.g. "id:a3f8b2c1"
 */
export function hashId(id) {
    if (id === null || id === undefined || id === '') return '[no-id]';
    const key = LOG_SALT;
    const digest = createHmac('sha256', key).update(String(id)).digest('hex');
    return `id:${digest.slice(0, 8)}`;
}
