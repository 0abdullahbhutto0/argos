import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import {
  generateOtpCode,
  hashOtp,
  normalizeEmail,
  OTP_COOLDOWN_MS,
  OTP_EXPIRY_MS,
  OTP_HOURLY_LIMIT,
} from "@/lib/otp";

const sendOtpSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = sendOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid email address" },
        { status: 400 },
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const now = new Date();

    // Clean up expired OTP records older than 1 hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    await prisma.emailOtp.deleteMany({
      where: {
        email,
        createdAt: { lt: oneHourAgo },
      },
    });

    // Check 60-second cooldown against the most recent OTP
    const latestOtp = await prisma.emailOtp.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (latestOtp) {
      const elapsedMs = now.getTime() - latestOtp.createdAt.getTime();
      if (elapsedMs < OTP_COOLDOWN_MS) {
        const retryAfter = Math.ceil((OTP_COOLDOWN_MS - elapsedMs) / 1000);
        return NextResponse.json(
          {
            error: `Please wait ${retryAfter}s before requesting another code.`,
            retryAfter,
          },
          { status: 429 },
        );
      }
    }

    // Check hourly rate limit
    const recentCount = await prisma.emailOtp.count({
      where: {
        email,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentCount >= OTP_HOURLY_LIMIT) {
      return NextResponse.json(
        {
          error: "Too many verification codes requested. Please try again later.",
        },
        { status: 429 },
      );
    }

    const code = generateOtpCode();
    const tokenHash = hashOtp(email, code);
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);

    const createdOtp = await prisma.emailOtp.create({
      data: {
        email,
        tokenHash,
        expiresAt,
      },
    });

    try {
      await sendOtpEmail(email, code);
    } catch (emailError) {
      // Roll back the OTP record so the user isn't stuck on cooldown if email delivery failed
      await prisma.emailOtp.delete({ where: { id: createdOtp.id } }).catch(() => {});
      const message =
        emailError instanceof Error
          ? emailError.message
          : "Failed to send verification email. Please try again.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      expiresInSeconds: OTP_EXPIRY_MS / 1000,
      cooldownSeconds: OTP_COOLDOWN_MS / 1000,
    });
  } catch (error) {
    console.error("[OTP Send Error]:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
