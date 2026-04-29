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

module.exports = { sendEmail };
