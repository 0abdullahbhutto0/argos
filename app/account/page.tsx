"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  ArrowLeft,
  Shield,
  Mail,
  Calendar,
  BarChart3,
  LogOut,
  Github,
  Pencil,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
interface AccountData {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    createdAt: string;
    providers: string[];
  };
  usage: {
    todayCount: number;
    totalAnalyses: number;
  };
}

const PROVIDER_ICONS: Record<string, { icon: typeof Github; label: string }> = {
  github: { icon: Github, label: "GitHub" },
  google: { icon: Mail, label: "Google" },
};

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);

  // Nickname editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    fetch("/api/auth/account")
      .then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setData(d);
          setNameValue(d.user.name || "");
        }
        setLoading(false);
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  const handleSaveName = useCallback(async () => {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameError("Name can't be empty");
      return;
    }
    if (trimmed.length > 50) {
      setNameError("Name is too long (max 50 characters)");
      return;
    }

    setSavingName(true);
    setNameError("");
    try {
      const res = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const result = await res.json();
      if (!res.ok) {
        setNameError(result.error || "Failed to update");
        return;
      }
      setData((prev) => prev ? { ...prev, user: { ...prev.user, name: result.name } } : prev);
      setNameValue(result.name);
      setEditingName(false);
    } catch {
      setNameError("Failed to update name");
    } finally {
      setSavingName(false);
    }
  }, [nameValue]);

  const CardSkeleton = () => (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );

  const user = data?.user;
  const usage = data?.usage;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>

        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Account</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your profile and usage</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* ─── Profile Card ─── */}
          {loading ? <CardSkeleton /> : user && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || "User"}
                    width={56}
                    height={56}
                    className="rounded-full ring-2 ring-border"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center ring-2 ring-border">
                    <span className="text-lg font-medium text-muted-foreground">
                      {user.name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {editingName ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={nameValue}
                          onChange={(e) => {
                            setNameValue(e.target.value);
                            setNameError("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveName();
                            if (e.key === "Escape") {
                              setEditingName(false);
                              setNameValue(user.name || "");
                              setNameError("");
                            }
                          }}
                          placeholder="Your name"
                          className="h-8 text-sm max-w-[200px]"
                          maxLength={50}
                          autoFocus
                          disabled={savingName}
                        />
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={handleSaveName}
                          disabled={savingName}
                        >
                          {savingName ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs"
                          onClick={() => {
                            setEditingName(false);
                            setNameValue(user.name || "");
                            setNameError("");
                          }}
                          disabled={savingName}
                        >
                          Cancel
                        </Button>
                      </div>
                      {nameError && (
                        <p className="text-xs text-destructive">{nameError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold truncate">{user.name || "Unnamed"}</h2>
                      <button
                        onClick={() => setEditingName(true)}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Edit name"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Member since {memberSince}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.providers.length > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                    {user.providers.map((provider) => {
                      const p = PROVIDER_ICONS[provider];
                      if (!p) return null;
                      const ProvIcon = p.icon;
                      return (
                        <Badge key={provider} variant="secondary" className="gap-1 text-xs font-normal">
                          <ProvIcon className="w-3 h-3" />
                          {p.label}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          )}


          {/* ─── Usage Card ─── */}
          {loading ? <CardSkeleton /> : usage && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-2xl font-semibold tabular-nums">{usage.todayCount}</p>
                  <p className="text-xs text-muted-foreground">Today&apos;s analyses</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-semibold tabular-nums">{usage.totalAnalyses}</p>
                  <p className="text-xs text-muted-foreground">Total analyses (last 2 days)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* ─── Sign Out ─── */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Sign out</p>
                  <p className="text-xs text-muted-foreground">Sign out of your account on this device</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
