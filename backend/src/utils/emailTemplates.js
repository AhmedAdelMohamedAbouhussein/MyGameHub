// ─── Shared Layout Shell ─────────────────────────────────────────────────────
import config from '../config/env.js';
const shell = (accentColor, content) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GameHub</title></head>
<body style="margin:0;padding:0;background:#0A0F14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#E6EDF3;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#161B22;border-radius:16px;border:1px solid #30363D;overflow:hidden;">
      <!-- Logo bar -->
      <tr><td style="padding:28px 36px 20px;border-bottom:1px solid #21262D;">
        <span style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#F0F6FC;">Game<span style="color:${accentColor};">Hub</span></span>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px 36px;">${content}</td></tr>
      <!-- Footer -->
      <tr><td style="padding:20px 36px;background:#0D1117;border-top:1px solid #21262D;text-align:center;">
        <p style="margin:0;font-size:11px;color:#484F58;line-height:18px;">
          &copy; ${new Date().getFullYear()} GameHub &bull; Automated message &mdash; do not reply
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

// ─── OTP Code Box ─────────────────────────────────────────────────────────────
const otpBox = (otp, color) =>
  `<div style="margin:24px 0;text-align:center;">
    <div style="display:inline-block;background:#0D1117;border:2px solid ${color};border-radius:12px;padding:18px 32px;">
      <span style="font-family:'Courier New',monospace;font-size:40px;font-weight:800;letter-spacing:14px;color:${color};">${otp}</span>
    </div>
    <p style="margin:12px 0 0;font-size:13px;color:#6E7681;">Expires in <strong style="color:#F0F6FC;">10 minutes</strong></p>
  </div>`;

// ─── Heading + subtext helper ─────────────────────────────────────────────────
const heading = (title, sub) =>
  `<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#F0F6FC;">${title}</h2>
   <p style="margin:0 0 20px;font-size:14px;line-height:22px;color:#8B949E;">${sub}</p>`;

// ─── 1. OTP Email ─────────────────────────────────────────────────────────────
const OTP_CONFIG = {
    email_verification:         { title: "Verify Your Email",              action: "confirm your email address",      color: "#10B981" },
    password_reset:             { title: "Password Reset Request",          action: "reset your account password",     color: "#3B82F6" },
    restore_account:            { title: "Account Restoration",             action: "restore your deleted account",    color: "#10B981" },
    permanently_delete_account: { title: "Action Required: Account Deletion", action: "permanently delete your account", color: "#EF4444" },
    deactivate_account:         { title: "Account Deactivation",            action: "deactivate your account",         color: "#F59E0B" },
};

export const generateOtpEmail = (userName, otp, purpose) => {
    const cfg = OTP_CONFIG[purpose] || { title: "Security Verification", action: "verify your identity", color: "#10B981" };
    const name = userName || "Gamer";

    const body =
        heading(cfg.title, `Hi ${name}, you requested to <strong>${cfg.action}</strong>. Use the code below:`) +
        otpBox(otp, cfg.color) +
        `<p style="margin:0;font-size:13px;color:#6E7681;">Didn't request this? Ignore this email or contact support.</p>`;

    return shell(cfg.color, body);
};

// ─── 2. Price Drop Alert Email ────────────────────────────────────────────────
/**
 * @param {string} userName
 * @param {string} gameName
 * @param {string} gameId       - RAWG game ID for the deep-link
 * @param {Array<{storeName:string, oldPrice:number, newPrice:number}>} drops
 */
export const generatePriceDropEmail = (userName, gameName, gameId, drops) => {
    const rows = drops.map(d => {
        const saving = (d.oldPrice - d.newPrice).toFixed(2);
        const pct    = Math.round((1 - d.newPrice / d.oldPrice) * 100);
        return `<tr>
          <td style="padding:10px 12px;font-size:14px;color:#F0F6FC;border-bottom:1px solid #21262D;">${d.storeName}</td>
          <td style="padding:10px 12px;font-size:14px;color:#8B949E;text-decoration:line-through;border-bottom:1px solid #21262D;">$${Number(d.oldPrice).toFixed(2)}</td>
          <td style="padding:10px 12px;font-size:14px;color:#10B981;font-weight:700;border-bottom:1px solid #21262D;">$${Number(d.newPrice).toFixed(2)}</td>
          <td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #21262D;">
            <span style="background:#10B98120;color:#10B981;border-radius:6px;padding:2px 8px;">-${pct}% / -$${saving}</span>
          </td>
        </tr>`;
    }).join('');

    const table =
        `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:10px;border:1px solid #30363D;overflow:hidden;margin:20px 0;">
          <thead>
            <tr style="background:#0D1117;">
              <th style="padding:10px 12px;font-size:12px;text-align:left;color:#6E7681;font-weight:600;text-transform:uppercase;">Store</th>
              <th style="padding:10px 12px;font-size:12px;text-align:left;color:#6E7681;font-weight:600;text-transform:uppercase;">Was</th>
              <th style="padding:10px 12px;font-size:12px;text-align:left;color:#6E7681;font-weight:600;text-transform:uppercase;">Now</th>
              <th style="padding:10px 12px;font-size:12px;text-align:left;color:#6E7681;font-weight:600;text-transform:uppercase;">Saving</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;

    const body =
        `<div style="display:inline-block;background:#10B98115;border:1px solid #10B98140;border-radius:8px;padding:4px 12px;margin-bottom:16px;">
          <span style="font-size:12px;font-weight:700;color:#10B981;text-transform:uppercase;letter-spacing:1px;">💸 Price Drop Alert</span>
        </div>` +
        heading(`<em style="font-style:normal;color:#10B981;">${gameName}</em> is on sale!`,
            `Hi ${userName || 'Gamer'}, a game on your wishlist just dropped in price.`) +
        table +
        `<a href="${config.frontendUrl}/games/${gameId}" style="display:inline-block;margin-top:8px;padding:12px 28px;background:#10B981;color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">View Game</a>`;

    return shell('#10B981', body);
};

// ─── 3. Account Permanently Purged Email ─────────────────────────────────────
/**
 * @param {string} userName
 */
export const generateAccountPurgedEmail = (userName) => {
    const body =
        `<div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:#EF444420;border-radius:14px;font-size:28px;">💀</div>
        </div>` +
        heading('Account Permanently Deleted',
            `Hi ${userName || 'Gamer'}, this is a final notice regarding your GameHub account.`) +
        `<div style="background:#EF444410;border:1px solid #EF444430;border-radius:10px;padding:16px 20px;margin:20px 0;">
          <p style="margin:0;font-size:14px;line-height:22px;color:#F0F6FC;">
            Your account was deactivated <strong>30 days ago</strong> and has now been <strong style="color:#EF4444;">permanently deleted</strong> along with all associated data including your game library, friends list, and wishlist.
          </p>
        </div>
        <p style="margin:20px 0 0;font-size:13px;color:#6E7681;line-height:20px;">
          If you believe this was a mistake or you have questions, please contact our support team. We're sorry to see you go.
        </p>`;

    return shell('#EF4444', body);
};

// ─── 4. Admin Daily Report Email ─────────────────────────────────────────────
/**
 * @param {Object} metrics
 */
export const generateAdminReportEmail = (metrics) => {
    const tableRows = [
        { label: "Total Registered Users", value: metrics.totalUsers },
        { label: "Active Users", value: metrics.activeUsers },
        { label: "Pending Deletions (Soft-deleted)", value: metrics.deletedUsers },
        { label: "Verified Accounts", value: metrics.verifiedUsers },
        { label: "Unverified Accounts", value: metrics.totalUsers - metrics.verifiedUsers },
        { label: "Users with Steam linked", value: metrics.steamUsers },
        { label: "Users with Epic linked", value: metrics.epicUsers },
        { label: "Users with PSN linked", value: metrics.psnUsers },
        { label: "Users with Xbox linked", value: metrics.xboxUsers },
    ].map(row => `
        <tr>
            <td style="padding:10px 12px;font-size:14px;color:#8B949E;border-bottom:1px solid #21262D;">${row.label}</td>
            <td style="padding:10px 12px;font-size:14px;color:#F0F6FC;font-weight:700;border-bottom:1px solid #21262D;text-align:right;">${row.value}</td>
        </tr>
    `).join('');

    const body =
        `<div style="display:inline-block;background:#3B82F615;border:1px solid #3B82F640;border-radius:8px;padding:4px 12px;margin-bottom:16px;">
          <span style="font-size:12px;font-weight:700;color:#3B82F6;text-transform:uppercase;letter-spacing:1px;">📊 Daily System Report</span>
        </div>` +
        heading('GameHub Admin Report',
            `Here is the automated daily summary of your platform's metrics.`) +
        `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:10px;border:1px solid #30363D;overflow:hidden;margin:20px 0;">
          <tbody>${tableRows}</tbody>
        </table>`;

    return shell('#3B82F6', body);
};

// ─── 5. Token / Session Expired Email ─────────────────────────────────────────
/**
 * @param {string} userName
 * @param {string} platform   - 'PSN' or 'Xbox'
 * @param {string} resyncUrl  - Full URL to the re-sync page (e.g. https://app.com/library/sync/psn)
 */
export const generateTokenExpiredEmail = (userName, platform, resyncUrl) => {
    const isXbox = platform === 'Xbox';
    const color  = isXbox ? '#107C10' : '#003791';
    const icon   = isXbox ? '🎮' : '🎮';
    const name   = userName || 'Gamer';

    const body =
        `<div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:${color}20;border-radius:14px;font-size:28px;">⚠️</div>
        </div>` +
        heading(`Your ${platform} Session Expired`,
            `Hi ${name}, your ${platform} connection to GameHub needs to be renewed.`) +
        `<div style="background:${color}10;border:1px solid ${color}30;border-radius:10px;padding:16px 20px;margin:20px 0;">
          <p style="margin:0;font-size:14px;line-height:22px;color:#F0F6FC;">
            Your <strong style="color:#F0F6FC;">${platform}</strong> refresh token has expired or been revoked —
            this usually happens when you <strong>change your ${platform} password</strong>,
            sign out of all devices, or after an extended period of inactivity.
          </p>
        </div>
        <p style="margin:0 0 20px;font-size:14px;line-height:22px;color:#8B949E;">
          Your library data is safe. You just need to re-authenticate to continue syncing your games and tracking achievements.
        </p>
        <a href="${resyncUrl}" style="display:inline-block;padding:13px 30px;background:${color};color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:0.5px;">
          Re-sync ${platform} →
        </a>
        <p style="margin:20px 0 0;font-size:12px;color:#484F58;">
          If you didn't expect this or need help, contact our support team.
        </p>`;

    return shell(color, body);
};

