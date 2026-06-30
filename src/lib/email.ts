import nodemailer from 'nodemailer';

// Configure the email transport using environment variables
// This allows the user to configure Brevo, Sendgrid, Gmail, etc.
// For testing locally without credentials, we can use Ethereal or just log the email.
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER) {
    console.log(`[Email Mock] To: ${to} | Subject: ${subject}`);
    console.log(`[Email Mock] Body:\n${html}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Plataforma Compres" <${process.env.SMTP_FROM || 'noreply@example.com'}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${info.messageId}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
  }
}
