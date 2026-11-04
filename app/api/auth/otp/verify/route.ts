import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  normalizeEmail,
  OTP_MAX_ATTEMPTS,
  SESSION_MAX_AGE_SECONDS,
  verifyOtpHash,
} from "@/lib/otp";

const verifyOtpSchema = z.object({
  email: z.email("Invalid email address"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid verification code" },
        { status: 400 },
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const { code } = parsed.data;
    const now = new Date();

    // Find the most recent OTP issued for this email
    const otpRecord = await prisma.emailOtp.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord || otpRecord.expiresAt < now) {
      return NextResponse.json(
        { error: "Verification code has expired or does not exist. Please request a new one." },
        { status: 400 },
      );
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      await prisma.emailOtp.delete({ where: { id: otpRecord.id } }).catch(() => {});
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new code." },
        { status: 429 },
      );
    }

    const isValid = verifyOtpHash(email, code, otpRecord.tokenHash);

    if (!isValid) {
      const updated = await prisma.emailOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });

      const remaining = OTP_MAX_ATTEMPTS - updated.attempts;
      if (remaining <= 0) {
        await prisma.emailOtp.delete({ where: { id: otpRecord.id } }).catch(() => {});
        return NextResponse.json(
          { error: "Too many failed attempts. Please request a new code." },
          { status: 429 },
        );
      }

      return NextResponse.json(
        {
          error: `Invalid verification code. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} remaining.`,
        },
        { status: 400 },
      );
    }

    // Valid OTP: delete OTP records, upsert User & email Account, and create a database Session
    const sessionToken = crypto.randomUUID();
    const expires = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.emailOtp.deleteMany({ where: { email } });

      const user = await tx.user.upsert({
        where: { email },
        update: {
          emailVerified: now,
        },
        create: {
          email,
          emailVerified: now,
        },
      });

      await tx.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: "email",
            providerAccountId: email,
          },
        },
        update: {},
        create: {
          userId: user.id,
          type: "email",
          provider: "email",
          providerAccountId: email,
        },
      });

      await tx.session.create({
        data: {
          sessionToken,
          userId: user.id,
          expires,
        },
      });
    });

    const isSecure =
      request.url.startsWith("https://") ||
      request.headers.get("x-forwarded-proto") === "https";
    const cookieName = isSecure
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isSecure,
      expires,
    });

    return response;
  } catch (error) {
    console.error("[OTP Verify Error]:", error);
    return NextResponse.json(
      { error: "Failed to verify code. Please try again." },
      { status: 500 },
    );
  }
}
