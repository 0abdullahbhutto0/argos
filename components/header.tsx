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
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header>
      <nav className="fixed z-20 w-full px-2 sm:px-4">
        <div
          className={cn(
            "mx-auto mt-2 sm:mt-3 w-full max-w-6xl px-3 sm:px-5",
            "bg-background/85 backdrop-blur-md rounded-xl border border-border/80 shadow-xs",
            "transition-all duration-200 ease-out",
            isScrolled && "max-w-4xl py-0.5",
          )}
        >
          <div className="flex items-center justify-between gap-3 py-2.5 sm:py-3">
            {/* Logo & Brand */}
            <Link
              href="/"
              className="flex items-center gap-2.5 min-w-0 group hover:opacity-90 transition-opacity"
            >
              <ArgosLogo className="h-6 w-auto sm:h-7 shrink-0" />
              <span className="font-semibold text-base sm:text-lg tracking-tight text-foreground">
                Argos
              </span>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <AuthButton />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
