import crypto from 'crypto';
import config from '../config/env.js';
import logger from './logger.js';

const algorithm = config.security.algorithm;
const ENCRYPTION_KEY = Buffer.from(config.security.encryptionKey, 'hex');
const IV_LENGTH = config.security.ivLength;

export function encrypt(text) {
    if (!text) return null;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(algorithm, ENCRYPTION_KEY, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        logger.error({ err: error }, 'Encryption error');
        return null;
    }
}

export function decrypt(data) {
    if (!data) return null;
    try {
        const parts = data.split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encryptedText = parts.join(':');
        const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        logger.error({ err: error }, 'Decryption error');
        return null;
    }
}
