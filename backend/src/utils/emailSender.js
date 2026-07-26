import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import config from '../config/env.js';
import logger from './logger.js';

// ── Nodemailer fallback transporter ──────────────────────────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    port: 465,
    secure: true,
    auth: {
        user: config.gmail.gmail,
        pass: config.gmail.password,
    },
});

/**
 * Send an email via Resend (primary) with nodemailer/Gmail as a runtime fallback.
 *
 * Flow:
 *  1. If RESEND_API_KEY is set → try Resend first.
 *  2. If Resend throws or returns an error → log a warning and fall back to nodemailer.
 *  3. If RESEND_API_KEY is not set → go straight to nodemailer.
 *
 * @param {{ from: string, to: string, subject: string, html: string }} options
 */
export async function sendEmail({ from, to, subject, html }) {
    if (config.gmail.resendApiKey) {
        try {
            const resend = new Resend(config.gmail.resendApiKey);
            const { data, error } = await resend.emails.send({ from, to, subject, html });

            if (error) {
                // Resend returned a structured API error — fall back to nodemailer
                logger.warn(
                    { resendError: error.message, to },
                    '[Email] Resend API error — falling back to nodemailer'
                );
                await transporter.sendMail({ from, to, subject, html });
                return;
            }

            logger.debug({ resendId: data?.id, to }, '[Email] Sent via Resend');
            return;

        } catch (err) {
            // Resend threw unexpectedly (network error, timeout, etc.) — fall back to nodemailer
            logger.warn(
                { message: err.message, to },
                '[Email] Resend threw an exception — falling back to nodemailer'
            );
            await transporter.sendMail({ from, to, subject, html });
            return;
        }
    }

    // No API key configured — use nodemailer directly
    logger.debug({ to }, '[Email] No RESEND_API_KEY — sending via nodemailer');
    await transporter.sendMail({ from, to, subject, html });
}
