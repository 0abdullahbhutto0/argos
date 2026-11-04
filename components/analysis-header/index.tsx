"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { formatNumber, formatDate, cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

import { AnalysisHeaderProps, StatItem } from "./types";
import { InfoSection } from "./info-section";
import { BranchSelector } from "./branch-selector";
import {
  Github,
  Star,
  GitFork,
  Eye,
  Code2,
  Scale,
  Copy,
  Clock,
  Target,
  CircleDot,
  Check,
} from "lucide-react";

export function AnalysisHeader({
  metadata,
  branch,
  availableBranches,
  onBranchChange,
  isLoading = false,
}: AnalysisHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = useCallback(async () => {
    await navigator.clipboard.writeText(
      `https://github.com/${metadata.fullName}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [metadata.fullName]);

  const currentBranch = branch || metadata.defaultBranch;

  const stats: StatItem[] = useMemo(
    () => [
      {
        icon: Star,
        value: metadata.stars,
        label: "Stars",
        highlight: true,
      },
      {
        icon: GitFork,
        value: metadata.forks,
        label: "Forks",
        highlight: false,
      },
      {
        icon: Eye,
        value: metadata.watchers,
        label: "Watchers",
        highlight: false,
      },
      {
        icon: CircleDot,
        value: metadata.openIssues,
        label: "Issues",
        highlight: false,
      },
    ],
    [metadata.stars, metadata.forks, metadata.watchers, metadata.openIssues]
  );

  return (
      <Card className="border-border/80 overflow-hidden p-0 bg-card shadow-xs">
        <div className="p-4 sm:p-6">
          {/* Top Row: Avatar, Info, Actions */}
          <div className="flex gap-3 sm:gap-4">
            {/* Avatar */}
            <div className="relative shrink-0 flex items-start justify-center">
              <Image
                src={metadata.owner.avatarUrl}
                alt={metadata.owner.login}
                width={56}
                height={56}
                unoptimized
                className="relative z-10 h-12 w-12 sm:h-14 sm:w-14 rounded-lg border border-border object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
                  {metadata.name}
                </h1>
                <Badge
                  variant={metadata.isPrivate ? "secondary" : "outline"}
                  className={cn(
                    "text-[10px] sm:text-xs shrink-0 font-mono",
                    !metadata.isPrivate && "border-primary/30 text-primary bg-primary/5"
                  )}
                >
                  {metadata.isPrivate ? "Private" : "Public"}
                </Badge>
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground">
                <Link
                  href={`https://github.com/${metadata.owner.login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors font-mono"
                >
                  @{metadata.owner.login}
                </Link>
              </p>
            </div>

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-start gap-2 shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                onClick={handleCopyUrl}
                title="Copy GitHub URL"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
                <Link
                  href={`https://github.com/${metadata.fullName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="w-3.5 h-3.5" />
                  GitHub
                </Link>
              </Button>
            </div>
          </div>

          {metadata.description && (
            <p className="text-sm text-muted-foreground leading-relaxed mt-3 sm:mt-4">
              {metadata.description}
            </p>
          )}

          {/* Meta Badges Row */}
          <div className="mt-4">
            {/* Mobile: Full-width Branch Selector */}
            {availableBranches &&
              availableBranches.length > 1 &&
              onBranchChange && (
                <div className="sm:hidden mb-3">
                  <BranchSelector
                    currentBranch={currentBranch}
                    branches={availableBranches}
                    onBranchChange={onBranchChange}
                    disabled={isLoading}
                    fullWidth
                  />
                </div>
              )}

            {/* Scrollable badges */}
            <ScrollArea className="w-full">
              <div className="flex items-center gap-1.5 pb-1 font-mono text-xs">
                {metadata.language && (
                  <Badge className="text-[10px] sm:text-xs shrink-0 gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                    <Code2 className="w-3 h-3" />
                    {metadata.language}
                  </Badge>
                )}
                {metadata.license && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] sm:text-xs shrink-0 gap-1"
                  >
                    <Scale className="w-3 h-3" />
                    {metadata.license}
                  </Badge>
                )}
                {/* Branch Selector - Desktop only (inline) */}
                <div className="hidden sm:block">
                  {availableBranches &&
                  availableBranches.length > 0 &&
                  onBranchChange ? (
                    <BranchSelector
                      currentBranch={currentBranch}
                      branches={availableBranches}
                      onBranchChange={onBranchChange}
                      disabled={isLoading}
                    />
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-[10px] sm:text-xs shrink-0 gap-1"
                    >
                      <Code2 className="w-3 h-3" />
                      {currentBranch}
                    </Badge>
                  )}
                </div>
                {/* Mobile fallback */}
                {(!availableBranches ||
                  availableBranches.length <= 1 ||
                  !onBranchChange) && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] sm:text-xs shrink-0 gap-1 sm:hidden"
                  >
                    <Code2 className="w-3 h-3" />
                    {currentBranch}
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className="text-[10px] sm:text-xs shrink-0 gap-1"
                >
                  <Clock className="w-3 h-3" />
                  {formatDate(metadata.pushedAt)}
                </Badge>
              </div>
              <ScrollBar orientation="horizontal" className="h-0 opacity-0" />
            </ScrollArea>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
            {stats.map(({ icon: Icon, value, label, highlight }) => (
              <div
                key={label}
                className={cn(
                  "group flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg transition-colors border",
                  highlight
                    ? "bg-primary/5 border-primary/25 hover:bg-primary/10"
                    : "bg-muted/20 border-border/60 hover:bg-muted/40"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    highlight
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div
                    className={cn(
                      "text-sm sm:text-base font-mono font-medium tabular-nums",
                      highlight ? "text-primary" : "text-foreground"
                    )}
                  >
                    {formatNumber(value)}
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">
                    {label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Actions */}
          <div className="flex sm:hidden gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleCopyUrl}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90"
              asChild
            >
              <Link
                href={`https://github.com/${metadata.fullName}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-3.5 h-3.5 mr-1.5" />
                GitHub
              </Link>
            </Button>
          </div>
        </div>

        {metadata.topics?.length > 0 && (
        <CardContent className="p-4 sm:p-6 pt-4 space-y-4 border-t border-border/60">
          {/* Topics */}
          {metadata.topics?.length > 0 && (
            <InfoSection
              icon={Target}
              title="Topics"
              description="Related categories and tags"
              accentColor="cyan"
              count={metadata.topics.length}
            >
              <ScrollArea className="w-full">
                <div className="flex gap-1.5 pb-1">
                  {metadata.topics.slice(0, 15).map((topic, index) => (
                    <Badge
                      key={topic}
                      variant="outline"
                      className={cn(
                        "text-[10px] sm:text-xs shrink-0 transition-colors cursor-default font-mono",
                        index === 0
                          ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                          : "bg-muted/20 hover:bg-muted/40"
                      )}
                    >
                      {topic}
                    </Badge>
                  ))}
                  {metadata.topics.length > 15 && (
                    <span className="text-[10px] sm:text-xs text-muted-foreground/50 self-center shrink-0 pl-1 font-mono">
                      +{metadata.topics.length - 15}
                    </span>
                  )}
                </div>
                <ScrollBar orientation="horizontal" className="h-0 opacity-0" />
              </ScrollArea>
            </InfoSection>
          )}

        </CardContent>
        )}
      </Card>
  );
}

export { BranchSelector } from "./branch-selector";
