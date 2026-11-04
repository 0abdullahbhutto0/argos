"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Github, Loader2, Mail, RotateCcw } from "lucide-react";
import Image from "next/image";

const OTP_LENGTH = 6;

export function LoginClient() {
  const router = useRouter();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === "otp") {
      const id = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(id);
    }
  }, [step]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.retryAfter) {
          setCooldown(data.retryAfter);
        }
        setError(data.error || "Failed to send verification code");
        return;
      }

      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setCooldown(data.cooldownSeconds ?? 60);
      setStep("otp");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitOtpCode = useCallback(
    async (code: string) => {
      if (code.length !== OTP_LENGTH) return;

      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), code }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invalid verification code");
          setLoading(false);
          return;
        }

        // Redirect home and refresh server session state
        window.location.href = "/";
      } catch {
        setError("Network error. Please try again.");
        setLoading(false);
      }
    },
    [email],
  );

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = digit;
    setOtpDigits(nextDigits);
    setError("");

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const joined = nextDigits.join("");
    if (digit && joined.length === OTP_LENGTH && nextDigits.every(Boolean)) {
      submitOtpCode(joined);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        const nextDigits = [...otpDigits];
        nextDigits[index - 1] = "";
        setOtpDigits(nextDigits);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    const nextDigits = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) {
      nextDigits[i] = pasted[i];
    }
    setOtpDigits(nextDigits);
    setError("");

    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();

    if (pasted.length === OTP_LENGTH) {
      submitOtpCode(pasted);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError("");

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.retryAfter) {
          setCooldown(data.retryAfter);
        }
        setError(data.error || "Failed to resend code");
        return;
      }

      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setCooldown(data.cooldownSeconds ?? 60);
      inputRefs.current[0]?.focus();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <button
          onClick={() => {
            if (step === "otp") {
              setStep("email");
              setError("");
            } else {
              router.back();
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          {step === "otp" ? "Change email" : "Back"}
        </button>

        <Card className="border-border/80 shadow-sm pt-0 overflow-hidden bg-card">
          <div className="relative h-28 sm:h-32 overflow-hidden border-b border-border/50 bg-muted/30">
            <Image
              src="/argos-auth-banner.png"
              alt="Argos analysis illustration"
              width={400}
              height={150}
              unoptimized
              className="object-cover w-full h-full brightness-95"
            />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {step === "email" ? (
              <motion.div
                key="email-step"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <CardHeader className="text-center space-y-2 pb-3 px-5 sm:px-6 pt-5">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                      Sign in to Argos
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                      Access your analysis history and saved repositories
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3.5 pt-0 px-5 sm:px-6 pb-6">
                  <form onSubmit={handleSendOtp} className="space-y-2.5">
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      autoComplete="email"
                      disabled={loading}
                      className="h-10 text-sm"
                      required
                    />
                    {error && (
                      <p className="text-xs text-destructive text-left">{error}</p>
                    )}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-10 gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4 shrink-0" />
                      )}
                      <span className="text-sm font-medium">
                        {loading ? "Sending code..." : "Continue with Email"}
                      </span>
                    </Button>
                  </form>

                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/60" />
                    </div>
                    <div className="relative flex justify-center text-[11px] uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        or continue with
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Button
                      variant="outline"
                      type="button"
                      disabled={loading}
                      className="w-full h-10 gap-2.5 cursor-pointer border-border hover:bg-muted/60"
                      onClick={() => signIn("github", { callbackUrl: "/" })}
                    >
                      <Github className="w-4 h-4 shrink-0" />
                      <span className="truncate text-sm font-medium">
                        Continue with GitHub
                      </span>
                    </Button>

                    <Button
                      variant="outline"
                      type="button"
                      disabled={loading}
                      className="w-full h-10 gap-2.5 cursor-pointer border-border hover:bg-muted/60"
                      onClick={() => signIn("google", { callbackUrl: "/" })}
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      <span className="truncate text-sm font-medium">
                        Continue with Google
                      </span>
                    </Button>
                  </div>

                  <div className="pt-3 border-t border-border/60">
                    <p className="text-[11px] text-center text-muted-foreground leading-normal">
                      By continuing, you agree to our{" "}
                      <Link href="/terms" className="underline hover:text-foreground">
                        Terms
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="underline hover:text-foreground">
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </div>
                </CardContent>
              </motion.div>
            ) : (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2 }}
              >
                <CardHeader className="text-center space-y-2 pb-3 px-5 sm:px-6 pt-5">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                      Check your email
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                      We sent a 6-digit verification code to{" "}
                      <span className="font-medium text-foreground break-all">
                        {email.trim()}
                      </span>
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-1 px-5 sm:px-6 pb-6">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitOtpCode(otpDigits.join(""));
                    }}
                    className="space-y-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {otpDigits.map((digit, index) => (
                        <Input
                          key={index}
                          ref={(el) => {
                            inputRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          autoComplete={index === 0 ? "one-time-code" : "off"}
                          maxLength={1}
                          value={digit}
                          disabled={loading}
                          onChange={(e) => handleDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={handlePaste}
                          className="h-11 w-full text-center font-mono text-base font-semibold px-0"
                          aria-label={`Digit ${index + 1}`}
                        />
                      ))}
                    </div>

                    {error && (
                      <p className="text-xs text-destructive text-center">{error}</p>
                    )}

                    <Button
                      type="submit"
                      disabled={loading || otpDigits.join("").length !== OTP_LENGTH}
                      className="w-full h-10 gap-2 cursor-pointer"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span className="text-sm font-medium">
                        {loading ? "Verifying..." : "Verify & Sign in"}
                      </span>
                    </Button>
                  </form>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-muted-foreground">
                    <span>Didn&apos;t receive the code?</span>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={cooldown > 0 || resending || loading}
                      className="inline-flex items-center gap-1 font-medium text-foreground hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {resending
                        ? "Sending..."
                        : cooldown > 0
                          ? `Resend in ${cooldown}s`
                          : "Resend code"}
                    </button>
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}
