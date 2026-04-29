const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false') === 'true',
  auth: process.env.SMTP_USER && process.env.SMTP_PASS
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const renderEmailTemplate = ({
  title,
  preheader,
  greeting,
  intro,
  highlight,
  details = [],
  note,
  actionText,
}) => {
  const detailRows = details
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:10px 0;color:#64748B;font-size:13px;border-bottom:1px solid #E2E8F0;">${escapeHtml(label)}</td>
          <td style="padding:10px 0;color:#1E293B;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid #E2E8F0;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');

  return `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F8FAFC;font-family:Arial,Helvetica,sans-serif;color:#1E293B;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader || title)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(26,26,46,0.10);">
            <tr>
              <td style="background:#16213E;padding:28px 30px;">
                <div style="font-size:11px;letter-spacing:2px;color:#4DD0E1;font-weight:700;text-transform:uppercase;">Olympus Lanka Hospital</div>
                <h1 style="margin:10px 0 0;color:#FFFFFF;font-size:24px;line-height:32px;">${escapeHtml(title)}</h1>
                <div style="width:44px;height:3px;background:#00BFA5;border-radius:999px;margin-top:14px;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                ${greeting ? `<p style="margin:0 0 12px;font-size:16px;line-height:24px;">${escapeHtml(greeting)}</p>` : ''}
                ${intro ? `<p style="margin:0 0 20px;color:#64748B;font-size:14px;line-height:22px;">${escapeHtml(intro)}</p>` : ''}
                ${highlight ? `
                  <div style="background:#E0F2F1;border:1px solid #B2DFDB;border-radius:14px;padding:18px;text-align:center;margin:20px 0;">
                    <div style="font-size:12px;color:#0D7F6F;font-weight:700;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(highlight.label || 'Code')}</div>
                    <div style="font-size:32px;letter-spacing:7px;color:#1A1A2E;font-weight:800;margin-top:8px;">${escapeHtml(highlight.value)}</div>
                  </div>` : ''}
                ${detailRows ? `
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
                    ${detailRows}
                  </table>` : ''}
                ${note ? `<p style="margin:18px 0 0;color:#64748B;font-size:13px;line-height:20px;">${escapeHtml(note)}</p>` : ''}
                ${actionText ? `<p style="margin:18px 0 0;color:#0D7F6F;font-size:13px;line-height:20px;font-weight:700;">${escapeHtml(actionText)}</p>` : ''}
              </td>
            </tr>
            <tr>
              <td style="background:#F1F5F9;padding:18px 30px;color:#94A3B8;font-size:12px;line-height:18px;">
                This is an automated message from Olympus Lanka Hospital. Please do not reply to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

async function sendEmail({ to, subject, text, html }) {
  if (!process.env.SMTP_HOST) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.');
  }

  // Help detect placeholder values that will never authenticate.
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  const mailFrom = process.env.MAIL_FROM || '';
  if (
    /your_smtp_user/i.test(smtpUser) ||
    /your_smtp_password/i.test(smtpPass) ||
    /no-reply@yourdomain\.com/i.test(mailFrom)
  ) {
    throw new Error(
      'SMTP credentials are still placeholders. Update SMTP_USER, SMTP_PASS, and MAIL_FROM in backend/.env with real values from your email provider.'
    );
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  if (!from) {
    throw new Error('Email sender is not configured. Set MAIL_FROM or SMTP_USER.');
  }

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendEmail, renderEmailTemplate };
