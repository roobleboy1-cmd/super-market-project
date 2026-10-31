import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

let transporter: nodemailer.Transporter | null = null;

export function getMailTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });
  } else {
    // Development fallback mock transporter
    logger.warn('SMTP credentials not fully configured. Using mock console mail transport for development.');
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'windows',
      buffer: true
    });
  }

  return transporter;
}

export async function sendPasswordResetEmail(toEmail: string, resetToken: string, userName?: string): Promise<void> {
  const resetLink = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const mailer = getMailTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1a56db; text-align: center;">Supermarket Management System</h2>
      <p>Hello ${userName || 'User'},</p>
      <p>We received a request to reset the password for your supermarket account.</p>
      <p>Click the button below to set a new password. This link is valid for <strong>15 minutes</strong> and can only be used once:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #1a56db; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #666; font-size: 13px;">If you did not request this password reset, please ignore this email or notify your system administrator immediately.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">Link: <a href="${resetLink}">${resetLink}</a></p>
    </div>
  `;

  try {
    const info = await mailer.sendMail({
      from: env.SMTP_FROM,
      to: toEmail,
      subject: 'Password Reset Request - Supermarket Management System',
      text: `Hello, you requested a password reset. Please visit: ${resetLink} (Link expires in 15 minutes).`,
      html
    });

    if (info.message) {
      logger.info(`[Dev Mail Stream] Sent reset email to: ${toEmail}. Reset URL: ${resetLink}`);
    } else {
      logger.info(`Password reset email delivered to: ${toEmail}`);
    }
  } catch (error: any) {
    logger.error(`Failed to deliver password reset email to ${toEmail}: ${error.message}`);
    // Do not throw to caller to maintain email enumeration prevention
  }
}
