"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";

interface UsageData {
  authenticated: boolean;
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

export function AuthButton() {
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch("/api/auth/usage")
      .then((r) => r.json())
      .then(setUsage)
      .catch((error) => console.error("Failed to fetch usage data:", error));
  }, []);

  // Loading state
  if (!usage) {
    return (
      <div className="h-8 w-8 rounded-full bg-muted/60 animate-pulse" />
    );
  }

  // Not authenticated — show sign-in button
  if (!usage.authenticated) {
    return (
      <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs font-medium cursor-pointer border-border/80">
        <Link href="/login" className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign in</span>
        </Link>
      </Button>
    );
  }

  // Authenticated — show avatar dropdown
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-full cursor-pointer ring-1 ring-border/80 hover:ring-border transition-all"
        >
          {usage.user?.image ? (
            <Image
              src={usage.user.image}
              alt={usage.user.name || "User"}
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
          ) : (
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-border/80 shadow-md">
        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-foreground truncate">{usage.user?.name || "User"}</p>
          <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">{usage.user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2 cursor-pointer text-xs">
          <Link href="/account">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
