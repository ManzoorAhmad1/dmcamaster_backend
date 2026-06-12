// ─── utils/emailTemplates.js ──────────────────────────────────────────────────
// All branded HTML email templates.
// Color scheme: navy #0B1F3B · gold #D4AF37 · gray #646e85
// ──────────────────────────────────────────────────────────────────────────────

// ─── Shared wrapper ───────────────────────────────────────────────────────────
const wrapper = (title, body) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — DMCA Master</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f9;font-family:'Inter',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:#0B1F3B;border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
                <tr>
                  <td style="width:64px;height:64px;background:linear-gradient(135deg,#f0c869 0%,#D4AF37 55%,#b8872a 100%);border-radius:16px;text-align:center;vertical-align:middle;box-shadow:0 10px 30px rgba(216,167,64,.35);">
                    <span style="font-size:30px;line-height:64px;">🛡️</span>
                  </td>
                </tr>
              </table>
              <h1 style="color:#ffffff;margin:0 0 8px;font-size:26px;font-weight:800;letter-spacing:-0.5px;">${title}</h1>
              <p style="color:#D4AF37;margin:0;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">DMCA MASTER PROTECTION PORTAL</p>
            </td>
          </tr>

          <!-- GOLD DIVIDER -->
          <tr>
            <td style="height:4px;background:linear-gradient(135deg,#f0c869,#D4AF37,#b8872a);"></td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#ffffff;padding:40px;border-left:1px solid #e6e8f0;border-right:1px solid #e6e8f0;">
              ${body}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#0B1F3B;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
              <p style="color:#D4AF37;margin:0 0 6px;font-size:13px;font-weight:700;">DMCA Master</p>
              <p style="color:#646e85;margin:0 0 4px;font-size:12px;">Professional Digital Rights Protection</p>
              <p style="color:#646e85;margin:0;font-size:11px;">legal@dmcamaster.com · +92 306 676 8863</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─── Verify Email ─────────────────────────────────────────────────────────────
const verifyEmailTemplate = (name, link) => wrapper('Verify Your Email', `
  <p style="color:#1a2138;font-size:16px;margin:0 0 14px;font-weight:600;">Hello ${name},</p>
  <p style="color:#646e85;font-size:14px;line-height:1.75;margin:0 0 28px;">
    Welcome to DMCA Master! You are one step away from protecting your digital content.
    Please verify your email address to activate your account.
  </p>

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:8px 0 32px;">
        <a href="${link}"
           style="display:inline-block;background:linear-gradient(135deg,#f0c869 0%,#D4AF37 55%,#b8872a 100%);
                  color:#0B1F3B;padding:16px 44px;border-radius:12px;font-weight:800;font-size:15px;
                  text-decoration:none;letter-spacing:0.3px;box-shadow:0 8px 24px rgba(216,167,64,.35);">
          ✓ &nbsp;Verify Email Address
        </a>
      </td>
    </tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f1f6;padding-top:20px;margin-top:4px;">
    <tr>
      <td>
        <p style="color:#a3aabd;font-size:12px;text-align:center;margin:0;">
          This link expires in <strong>24 hours</strong>.<br>
          If you didn't create an account, you can safely ignore this email.
        </p>
      </td>
    </tr>
  </table>
`);

// ─── Reset Password ───────────────────────────────────────────────────────────
const resetPasswordTemplate = (name, link) => wrapper('Reset Your Password', `
  <p style="color:#1a2138;font-size:16px;margin:0 0 14px;font-weight:600;">Hello ${name},</p>
  <p style="color:#646e85;font-size:14px;line-height:1.75;margin:0 0 28px;">
    We received a request to reset your DMCA Master password.
    Click the button below to set a new password — this link is valid for <strong>1 hour</strong>.
  </p>

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:8px 0 28px;">
        <a href="${link}"
           style="display:inline-block;background:linear-gradient(135deg,#f0c869 0%,#D4AF37 55%,#b8872a 100%);
                  color:#0B1F3B;padding:16px 44px;border-radius:12px;font-weight:800;font-size:15px;
                  text-decoration:none;box-shadow:0 8px 24px rgba(216,167,64,.35);">
          🔑 &nbsp;Reset My Password
        </a>
      </td>
    </tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#fdf3e1;border:1px solid #eed8a8;border-radius:10px;padding:14px 18px;">
        <p style="color:#c9821f;margin:0;font-size:13px;">
          ⚠️ &nbsp;If you didn't request a password reset, please ignore this email.
          Your password will remain unchanged.
        </p>
      </td>
    </tr>
  </table>
`);

// ─── Contact Form (admin notification) ───────────────────────────────────────
const contactEmailTemplate = ({ firstName, lastName, email, phone, message }) => wrapper(
  'New Contact Request',
  `
  <!-- Sender info -->
  <table width="100%" cellpadding="0" cellspacing="0"
         style="border:1.5px solid #D4AF37;border-radius:12px;margin-bottom:28px;overflow:hidden;">
    <tr>
      <td style="background:#fbf3df;padding:14px 20px;border-bottom:1px solid #eed8a8;">
        <p style="margin:0;font-size:13px;font-weight:800;color:#0B1F3B;text-transform:uppercase;letter-spacing:.5px;">
          Contact Information
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f4f5f9;width:90px;">
              <span style="font-size:13px;font-weight:700;color:#1a2138;">👤 Name</span>
            </td>
            <td style="padding:8px 0;border-bottom:1px solid #f4f5f9;">
              <span style="font-size:14px;color:#1a2138;">${firstName} ${lastName || ''}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #f4f5f9;">
              <span style="font-size:13px;font-weight:700;color:#1a2138;">📧 Email</span>
            </td>
            <td style="padding:8px 0;border-bottom:1px solid #f4f5f9;">
              <a href="mailto:${email}" style="font-size:14px;color:#D4AF37;font-weight:600;text-decoration:none;">${email}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;">
              <span style="font-size:13px;font-weight:700;color:#1a2138;">📱 Phone</span>
            </td>
            <td style="padding:8px 0;">
              <span style="font-size:14px;color:#646e85;">${phone || '<em>Not provided</em>'}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Message -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding-bottom:12px;">
        <p style="margin:0;font-size:13px;font-weight:800;color:#0B1F3B;text-transform:uppercase;letter-spacing:.5px;">
          💬 &nbsp;Message
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#f4f5f9;border-left:4px solid #D4AF37;border-radius:0 8px 8px 0;padding:18px 20px;">
        <p style="font-size:14px;color:#1a2138;line-height:1.75;margin:0;">
          ${message.replace(/\n/g, '<br>')}
        </p>
      </td>
    </tr>
  </table>

  <!-- Reply CTA -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr>
      <td align="center">
        <a href="mailto:${email}"
           style="display:inline-block;background:#0B1F3B;color:#D4AF37;
                  padding:13px 32px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
          Reply to ${firstName} →
        </a>
      </td>
    </tr>
  </table>
  `
);

// ─── OTP Verification Email ───────────────────────────────────────────────────
const otpEmailTemplate = (name, otp) => wrapper('Email Verification Code', `
  <p style="color:#1a2138;font-size:16px;margin:0 0 14px;font-weight:600;">Hello ${name},</p>
  <p style="color:#646e85;font-size:14px;line-height:1.75;margin:0 0 28px;">
    Use the 6-digit code below to verify your DMCA Master account.<br>
    This code expires in <strong>10 minutes</strong>.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:8px 0 32px;">
        <div style="display:inline-block;background:#0B1F3B;border-radius:16px;padding:20px 40px;">
          <span style="font-family:'Courier New',monospace;font-size:40px;font-weight:900;letter-spacing:12px;color:#D4AF37;">${otp}</span>
        </div>
      </td>
    </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f1f6;padding-top:20px;">
    <tr>
      <td>
        <p style="color:#a3aabd;font-size:12px;text-align:center;margin:0;">
          Never share this code with anyone.<br>
          If you did not request this, please ignore this email.
        </p>
      </td>
    </tr>
  </table>
`);

// ─── OTP Reset Password Email ─────────────────────────────────────────────────
const resetOtpEmailTemplate = (name, otp) => wrapper('Password Reset Code', `
  <p style="color:#1a2138;font-size:16px;margin:0 0 14px;font-weight:600;">Hello ${name},</p>
  <p style="color:#646e85;font-size:14px;line-height:1.75;margin:0 0 28px;">
    Use the 6-digit code below to reset your DMCA Master password.<br>
    This code expires in <strong>10 minutes</strong>.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:8px 0 28px;">
        <div style="display:inline-block;background:#0B1F3B;border-radius:16px;padding:20px 40px;">
          <span style="font-family:'Courier New',monospace;font-size:40px;font-weight:900;letter-spacing:12px;color:#D4AF37;">${otp}</span>
        </div>
      </td>
    </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#fdf3e1;border:1px solid #eed8a8;border-radius:10px;padding:14px 18px;">
        <p style="color:#c9821f;margin:0;font-size:13px;">
          ⚠️ &nbsp;If you did not request a password reset, please ignore this email.
        </p>
      </td>
    </tr>
  </table>
`);

// ─── Case Notification Email (to admin) ──────────────────────────────────────
const caseNotificationTemplate = ({ clientName, clientEmail, caseRef, title, contentType, contentDesc, platforms, infrUrls, urgency, plan, notes }) =>
  wrapper('New Case Submitted', `
  <p style="color:#1a2138;font-size:16px;font-weight:600;margin:0 0 6px;">A new protection case has been submitted.</p>
  <p style="color:#646e85;font-size:13px;margin:0 0 24px;">Login to the admin panel to manage this case.</p>

  <!-- Case Info -->
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #D4AF37;border-radius:12px;overflow:hidden;margin-bottom:16px;">
    <tr><td style="background:#fbf3df;padding:12px 20px;border-bottom:1px solid #eed8a8;">
      <p style="margin:0;font-size:12px;font-weight:800;color:#0B1F3B;text-transform:uppercase;letter-spacing:.8px;">📋 Case Information</p>
    </td></tr>
    <tr><td style="padding:16px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${[['Case Ref', caseRef],['Title', title],['Content Type', contentType],['Platforms', Array.isArray(platforms) ? platforms.join(', ') : (platforms||'—')],['Urgency', urgency],['Plan', plan]].map(([k,v]) => `
        <tr><td style="padding:7px 0;border-bottom:1px solid #f4f5f9;width:120px;font-size:12px;font-weight:700;color:#1a2138;vertical-align:top;">${k}</td>
            <td style="padding:7px 0;border-bottom:1px solid #f4f5f9;font-size:13px;color:#646e85;">${v || '—'}</td></tr>`).join('')}
      </table>
    </td></tr>
  </table>

  <!-- Client Info -->
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #c5d3e8;border-radius:12px;overflow:hidden;margin-bottom:16px;">
    <tr><td style="background:#eef3fb;padding:12px 20px;border-bottom:1px solid #c5d3e8;">
      <p style="margin:0;font-size:12px;font-weight:800;color:#0B1F3B;text-transform:uppercase;letter-spacing:.8px;">👤 Client Details</p>
    </td></tr>
    <tr><td style="padding:16px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${[['Name', clientName],['Email', clientEmail]].map(([k,v]) => `
        <tr><td style="padding:7px 0;border-bottom:1px solid #f4f5f9;width:120px;font-size:12px;font-weight:700;color:#1a2138;">${k}</td>
            <td style="padding:7px 0;border-bottom:1px solid #f4f5f9;font-size:13px;color:#646e85;">${v || '—'}</td></tr>`).join('')}
        ${(notes || '').split('\n')[0].split(' | ').map(part => {
          const [k,...rest] = part.split(': '); return k && rest.length ? `
        <tr><td style="padding:7px 0;border-bottom:1px solid #f4f5f9;width:120px;font-size:12px;font-weight:700;color:#1a2138;">${k}</td>
            <td style="padding:7px 0;border-bottom:1px solid #f4f5f9;font-size:13px;color:#646e85;">${rest.join(': ')}</td></tr>` : ''; }).join('')}
      </table>
    </td></tr>
  </table>

  ${contentDesc ? `<div style="background:#f4f5f9;border-left:4px solid #0B1F3B;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px;"><p style="font-size:12px;font-weight:700;color:#0B1F3B;margin:0 0 6px;">Content Description</p><p style="font-size:13px;color:#646e85;margin:0;white-space:pre-wrap;">${contentDesc}</p></div>` : ''}
  ${infrUrls ? `<div style="background:#f4f5f9;border-left:4px solid #D4AF37;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px;"><p style="font-size:12px;font-weight:700;color:#0B1F3B;margin:0 0 6px;">Infringing URLs</p><p style="font-family:monospace;font-size:12px;color:#646e85;margin:0;white-space:pre-wrap;">${infrUrls}</p></div>` : ''}
  ${notes && (notes.split('\n')[1] || '') ? `<div style="background:#f4f5f9;border-left:4px solid #aab4c8;padding:12px 16px;border-radius:0 8px 8px 0;"><p style="font-size:12px;font-weight:700;color:#0B1F3B;margin:0 0 6px;">Additional Notes</p><p style="font-size:13px;color:#646e85;margin:0;white-space:pre-wrap;">${(notes || '').split('\n').slice(1).join('\n')}</p></div>` : ''}
`);

module.exports = { verifyEmailTemplate, resetPasswordTemplate, contactEmailTemplate, otpEmailTemplate, resetOtpEmailTemplate, caseNotificationTemplate };
