// ─── config/mailer.js ─────────────────────────────────────────────────────────
// Creates and exports the Nodemailer transporter.
// All settings are read from .env — change there, no code edits needed.
// Auto-tries port 465 (SSL) then 587 (TLS) if first attempt fails.
// ──────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const nodemailer = require('nodemailer');

const HOST      = process.env.SMTP_HOST           || 'smtp.hostinger.com';
const PORT      = parseInt(process.env.SMTP_PORT  || '465');
const SECURE    = process.env.SMTP_SECURE         !== 'false';
const USER      = process.env.EMAIL_FROM_ADDRESS  || 'legal@dmcamaster.com';
const PASS      = process.env.EMAIL_PASS;
const FROM_NAME = process.env.EMAIL_FROM_NAME     || 'DMCA Master';

// Friendly "From" used in all emails, e.g. "DMCA Master <legal@dmcamaster.com>"
const FROM = `${FROM_NAME} <${USER}>`;

// ─── Build a transporter ─────────────────────────────────────────────────────
const makeTransport = (port, secure) =>
  nodemailer.createTransport({
    host:   HOST,
    port,
    secure,
    auth:   { user: USER, pass: PASS },
    tls:    { rejectUnauthorized: false },
  });

// ─── Send with retry + port fallback ─────────────────────────────────────────
/**
 * Send an email.
 * First attempts PORT/SECURE from .env (465/SSL by default).
 * On auth failure, retries with port 587 / STARTTLS.
 * On transient failure, retries after 2 s (up to maxRetries total).
 *
 * @param {object} mailOptions  - Standard Nodemailer mail options
 * @param {number} maxRetries   - Attempts per port (default 2)
 */
const sendEmail = async (mailOptions, maxRetries = 2) => {
  if (!mailOptions.from) mailOptions.from = FROM;

  // Configs to try in order: primary (env) → fallback 587
  const configs = [
    { port: PORT,  secure: SECURE },
    { port: 587,   secure: false  },
  ];

  let lastError;
  for (const cfg of configs) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const tr   = makeTransport(cfg.port, cfg.secure);
        const info = await tr.sendMail(mailOptions);
        console.log(`  📧  Email sent [port ${cfg.port}, attempt ${attempt}] → ${info.messageId}`);
        return info;
      } catch (err) {
        lastError = err;
        const isAuthErr = err.responseCode === 535 || err.message.includes('authentication') || err.message.includes('535');
        console.warn(`  ⚠️   Email failed [port ${cfg.port}, attempt ${attempt}]: ${err.message}`);
        if (isAuthErr) break; // auth errors won't be fixed by retrying same port
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  console.error(`  ❌  All email attempts failed. Last error: ${lastError?.message}`);
  console.error(`  ❌  Check EMAIL_PASS in .env — it must match your Hostinger email password.`);
  throw lastError;
};

module.exports = { sendEmail, FROM };
