import crypto from "crypto";

export const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_COOLDOWN_MS = 60 * 1000; // 60 seconds between sends
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_HOURLY_LIMIT = 5;
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_SECRET environment variable.");
  }
  return secret;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtp(email: string, code: string): string {
  const normalized = normalizeEmail(email);
  return crypto
    .createHmac("sha256", getSecret())
    .update(`${normalized}:${code.trim()}`)
    .digest("hex");
}

export function verifyOtpHash(
  email: string,
  code: string,
  expectedHash: string,
): boolean {
  const computedHash = hashOtp(email, code);
  const a = Buffer.from(computedHash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}
