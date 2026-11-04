import nodemailer from "nodemailer";

const DEFAULT_GMAIL_USER = "0abdullahbhutto0@gmail.com";

function getTransporter() {
  const user = process.env.GOOGLE_EMAIL || DEFAULT_GMAIL_USER;
  const rawPassword = process.env.GOOGLE_APP_PASSWORD;

  if (!rawPassword) {
    throw new Error(
      "Missing GOOGLE_APP_PASSWORD environment variable. Please check your .env file.",
    );
  }

  return {
    user,
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass: rawPassword.replace(/\s+/g, ""),
      },
    }),
  };
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const { user, transporter } = getTransporter();

  if (process.env.NODE_ENV !== "production") {
    console.info(`\n[Argos Auth] OTP for ${email}: ${code} (expires in 10 minutes)\n`);
  }

  await transporter.sendMail({
    from: `"Argos" <${user}>`,
    to: email,
    subject: `${code} is your Argos verification code`,
    text: `Your Argos verification code is ${code}.\n\nThis code will expire in 10 minutes.\nIf you didn't request this code, you can safely ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 440px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; color: #111827;">
        <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; letter-spacing: -0.02em;">Sign in to Argos</h2>
        <p style="margin: 0 0 24px 0; font-size: 14px; color: #4b5563; line-height: 1.5;">
          Enter the following verification code to continue signing in to your Argos account:
        </p>
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #111827;">
            ${code}
          </span>
        </div>
        <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
          This code expires in <strong>10 minutes</strong>. If you did not request this email, you can safely ignore it.
        </p>
      </div>
    `,
  });
}
