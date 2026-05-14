import * as sib from "@getbrevo/brevo";
import { envConfig } from "./envConfig.js";


let apiKey = envConfig.EMAIL_CONFIG.BREVO_SMTP_SDK_KEY;

const client = new sib.BrevoClient({
  apiKey: apiKey!,
});

type SendEmailProps = {
  to: string;
  subject: string;
  templet: string;
};

export const sendEmail = async ({ to, subject, templet }: SendEmailProps) => {
  try {
    const res = await client.transactionalEmails.sendTransacEmail({
      sender: {
        email: envConfig.EMAIL_CONFIG.EMAIL_FROM,
        name: "Esay Thumbnail",
      },

      to: [{ email: to }],
      subject: subject,
      htmlContent: templet,
    });

    return res;
  } catch (error) {
    console.error("Brevo error:", error);

    throw error;
  }
};