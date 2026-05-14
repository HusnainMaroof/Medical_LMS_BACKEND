import * as sib from "@getbrevo/brevo";
import { envConfig } from "../config/envConfig.js";

const client = new sib.BrevoClient({
  apiKey: envConfig.EMAIL_CONFIG.BREVO_SMTP_SDK_KEY!,
});

const SENDER = {
  email: envConfig.EMAIL_CONFIG.EMAIL_FROM,
  name: "Your App Name", // ← update to your actual sender name
} as const;

// ============================================================
// ─── CORE SENDER (private) ──────────────────────────────────
// ============================================================

type SendEmailProps = {
  to: string;
  subject: string;
  html: string;
};

const sendEmail = async ({
  to,
  subject,
  html,
}: SendEmailProps): Promise<void> => {
  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: SENDER,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });
  } catch (error) {
    console.error(`[Brevo] Failed to send email to ${to}:`, error);
    throw error;
  }
};

// ============================================================
// ─── TEMPLATES (private) ────────────────────────────────────
// ============================================================

const studentCredentialsTemplate = (
  fullName: string,
  email: string,
  password: string,
  studentCode: string,
  batchName: string,
): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Account Credentials</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#4f46e5;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Welcome to the platform</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:16px;">Hi <strong>${fullName}</strong>,</p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;">
                You have been enrolled in <strong>${batchName}</strong>. Here are your login credentials:
              </p>

              <!-- Credentials box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;color:#6b7280;font-size:14px;width:140px;">Email</td>
                        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${email}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#6b7280;font-size:14px;">Student Code</td>
                        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${studentCode}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#6b7280;font-size:14px;">Password</td>
                        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${password}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#6b7280;font-size:14px;">Batch</td>
                        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${batchName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#ef4444;font-size:13px;">
                ⚠️ Please change your password after your first login.
              </p>
              <p style="margin:0;color:#6b7280;font-size:13px;">
                Keep these credentials safe and do not share them with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const passwordResetTemplate = (
  fullName: string,
  resetLink: string,
  expiryMinutes: number,
): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#4f46e5;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Reset Your Password</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:16px;">Hi <strong>${fullName}</strong>,</p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;">
                We received a request to reset your password. Click the button below to choose a new one.
                This link will expire in <strong>${expiryMinutes} minutes</strong>.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#4f46e5;border-radius:6px;">
                    <a
                      href="${resetLink}"
                      target="_blank"
                      style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;"
                    >
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;">
                <a href="${resetLink}" style="color:#4f46e5;font-size:13px;">${resetLink}</a>
              </p>

              <!-- Warning box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#92400e;font-size:13px;">
                      ⚠️ If you did not request a password reset, ignore this email. Your password will not change.
                      Never share this link with anyone.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                This link expires in ${expiryMinutes} minutes. This is an automated message — please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ============================================================
// ─── PUBLIC EMAIL FUNCTIONS ─────────────────────────────────
// ============================================================

export const sendStudentCredentialsEmail = async (
  email: string,
  fullName: string,
  password: string,
  studentCode: string,
  batchName: string,
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: `Your login credentials for ${batchName}`,
    html: studentCredentialsTemplate(
      fullName,
      email,
      password,
      studentCode,
      batchName,
    ),
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  fullName: string,
  resetLink: string,
  expiryMinutes = 15,
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: "Reset your password",
    html: passwordResetTemplate(fullName, resetLink, expiryMinutes),
  });
};
