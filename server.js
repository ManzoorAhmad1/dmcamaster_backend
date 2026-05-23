/**
 * Axontix Software House — Email API
 * Express + Nodemailer (Hostinger SMTP)
 */
require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

// ──────────────────────────────────────────────────────────
// CORS
// ──────────────────────────────────────────────────────────
const allowList = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://axontix.com",
  "https://www.axontix.com",
  ...(process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean),
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowList.includes(origin)) return cb(null, true);
      return cb(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────────────────────
// SMTP (Hostinger)
// Configure via env. Defaults match the client-supplied creds.
// ──────────────────────────────────────────────────────────
const smtpConfig = {
  host: process.env.EMAIL_HOST || "smtp.hostinger.com",
  port: Number(process.env.EMAIL_PORT || 465),
  secure: String(process.env.EMAIL_SECURE || "true") === "true",
  auth: {
    user: process.env.EMAIL_USER || "info@northlimo.ca",
    pass: process.env.EMAIL_PASS || "B+#1T?1Ph8",
  },
  tls: { rejectUnauthorized: false },
};

const FROM_NAME = process.env.EMAIL_FROM_NAME || "Axontix Software House";
const FROM_ADDR = process.env.EMAIL_FROM_ADDRESS || smtpConfig.auth.user;
const CONTACT_INBOX =
  process.env.CONTACT_INBOX_EMAIL || "info@axontix.com";

const createTransporter = () => nodemailer.createTransport(smtpConfig);

// Verify on boot (non-fatal)
createTransporter().verify((err) => {
  if (err) console.warn("[SMTP] verify failed:", err.message);
  else console.log("[SMTP] ready");
});

const sendWithRetry = async (opts, max = 2) => {
  let lastErr;
  for (let i = 1; i <= max; i++) {
    try {
      const t = createTransporter();
      const info = await t.sendMail(opts);
      return info;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastErr;
};

// ──────────────────────────────────────────────────────────
// Beautiful email template
// ──────────────────────────────────────────────────────────
const renderHtml = ({ fullName, email, phone, subject, message }) => `
<!DOCTYPE html>
<html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Inter',Arial,sans-serif;color:#0f172a;">
  <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px -12px rgba(15,23,42,.18);">
    <div style="background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 50%,#0ea5e9 100%);padding:36px 28px;color:#fff;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,.18);padding:8px 14px;border-radius:999px;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Axontix · New Lead</div>
      <h1 style="margin:14px 0 0;font-size:24px;font-weight:700;">New Contact Form Submission</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:13px;">Submitted ${new Date().toLocaleString("en-CA")}</p>
    </div>
    <div style="padding:30px 28px;">
      <h2 style="margin:0 0 16px;font-size:15px;letter-spacing:1px;text-transform:uppercase;color:#1d4ed8;">Contact Info</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:10px 0;color:#64748b;width:120px;">Name</td><td style="padding:10px 0;font-weight:600;">${fullName || "-"}</td></tr>
        <tr><td style="padding:10px 0;color:#64748b;">Email</td><td style="padding:10px 0;"><a href="mailto:${email}" style="color:#2563eb;text-decoration:none;font-weight:600;">${email || "-"}</a></td></tr>
        <tr><td style="padding:10px 0;color:#64748b;">Phone</td><td style="padding:10px 0;">${phone || '<span style="color:#94a3b8;">Not provided</span>'}</td></tr>
        <tr><td style="padding:10px 0;color:#64748b;">Subject</td><td style="padding:10px 0;">${subject || '<span style="color:#94a3b8;">General inquiry</span>'}</td></tr>
      </table>

      <h2 style="margin:24px 0 12px;font-size:15px;letter-spacing:1px;text-transform:uppercase;color:#1d4ed8;">Message</h2>
      <div style="background:#f8fafc;border-left:4px solid #2563eb;padding:18px 20px;border-radius:8px;font-size:14px;line-height:1.65;white-space:pre-wrap;">${(message || "").replace(/[<>&]/g, (c) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;" }[c]))}</div>

      <div style="text-align:center;margin:28px 0 4px;">
        <a href="mailto:${email}" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#0ea5e9);color:#fff;text-decoration:none;padding:13px 28px;border-radius:999px;font-weight:600;font-size:14px;">Reply to ${fullName || "lead"}</a>
      </div>
    </div>
    <div style="background:#05070d;color:#94a3b8;padding:22px;text-align:center;font-size:12px;">
      © ${new Date().getFullYear()} Axontix Software House · Built in Canada
    </div>
  </div>
</body></html>`;

// ──────────────────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({ status: "OK", service: "axontix-mail" })
);

// New canonical endpoint
app.post("/api/contact", async (req, res) => {
  try {
    const { fullName, email, phone, subject, message } = req.body || {};
    if (!fullName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "fullName, email and message are required.",
      });
    }

    await sendWithRetry({
      from: `"${FROM_NAME}" <${FROM_ADDR}>`,
      to: CONTACT_INBOX,
      replyTo: email,
      subject: `🚀 New lead: ${subject || "General"} — ${fullName}`,
      html: renderHtml({ fullName, email, phone, subject, message }),
    });

    return res.json({ success: true, message: "Email sent successfully." });
  } catch (err) {
    console.error("[/api/contact]", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to send email. Please try again later.",
    });
  }
});

// Legacy alias (kept for backwards compatibility)
app.post("/api/send-email", (req, res, next) => {
  // map legacy field names to new ones
  const b = req.body || {};
  req.body = {
    fullName: b.fullName || `${b.firstName || ""} ${b.lastName || ""}`.trim(),
    email: b.email,
    phone: b.phone,
    subject: b.subject,
    message: b.message,
  };
  return app._router.handle(
    Object.assign(req, { url: "/api/contact", method: "POST" }),
    res,
    next
  );
});

app.listen(PORT, () => {
  console.log(`Axontix mail API on http://localhost:${PORT}`);
  console.log(`POST  /api/contact`);
});
