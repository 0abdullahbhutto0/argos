"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ui/theme-toggle";
import ArgosLogo from "./icons/Argos-logo";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";

export const HeroHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header>
      <nav className="fixed z-20 w-full px-2 sm:px-4" aria-label="Main navigation">
        <div className={cn(
          "mx-auto mt-2 w-full max-w-6xl px-3 sm:mt-3 sm:px-5",
          "rounded-xl border border-border/80 bg-background/85 shadow-xs backdrop-blur-md",
          "transition-all duration-200 ease-out",
          isScrolled && "max-w-4xl py-0.5",
        )}>
          <div className="flex items-center justify-between gap-3 py-2.5 sm:py-3">
            <Link href="/" className="group flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-90">
              <ArgosLogo className="h-6 w-auto shrink-0 sm:h-7" />
              <span className="text-base font-semibold tracking-tight text-foreground sm:text-lg">Argos</span>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <AuthButton />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
