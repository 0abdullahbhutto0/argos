"use client";

import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber, cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { AnalysisHeaderProps, StatItem } from "./types";
import { BranchSelector } from "./branch-selector";
import { Github, Star, GitFork, Eye, GitBranch, Copy, CircleDot, Check, ArrowUpRight } from "lucide-react";

export function AnalysisHeader({ metadata, branch, availableBranches, onBranchChange, isLoading = false }: AnalysisHeaderProps) {
  const [copied, setCopied] = useState(false);
  const currentBranch = branch || metadata.defaultBranch;
  const handleCopyUrl = useCallback(async () => {
    await navigator.clipboard.writeText(`https://github.com/${metadata.fullName}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [metadata.fullName]);

  const stats: StatItem[] = useMemo(() => [
    { icon: Star, value: metadata.stars, label: "Stars", highlight: true },
    { icon: GitFork, value: metadata.forks, label: "Forks", highlight: false },
    { icon: Eye, value: metadata.watchers, label: "Watchers", highlight: false },
    { icon: CircleDot, value: metadata.openIssues, label: "Issues", highlight: false },
  ], [metadata.stars, metadata.forks, metadata.watchers, metadata.openIssues]);

  return (
    <Card className="gap-0 overflow-hidden rounded-lg border-border bg-card p-0 shadow-none">
      <div className="flex flex-col justify-between gap-5 p-4 sm:p-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-3.5">
          <Image src={metadata.owner.avatarUrl} alt={metadata.owner.login} width={44} height={44} unoptimized className="h-11 w-11 shrink-0 rounded-md border border-border object-cover" />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 className="truncate font-mono text-base font-semibold tracking-tight text-foreground sm:text-lg" title={metadata.name}>{metadata.name}</h2>
              <Badge variant="outline" className="shrink-0 rounded-sm border-border px-1.5 py-0 font-mono text-[9px] font-normal text-muted-foreground">{metadata.isPrivate ? "private" : "public"}</Badge>
            </div>
            <Link href={`https://github.com/${metadata.owner.login}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-mono text-[11px] text-muted-foreground transition-colors hover:text-primary">@{metadata.owner.login}</Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {availableBranches && availableBranches.length > 0 && onBranchChange ? (
            <BranchSelector currentBranch={currentBranch} branches={availableBranches} onBranchChange={onBranchChange} disabled={isLoading} />
          ) : (
            <Badge variant="outline" className="h-9 max-w-48 gap-1.5 rounded-md border-border px-2.5 font-mono text-[11px] font-normal text-muted-foreground"><GitBranch className="h-3 w-3 shrink-0" /><span className="truncate">{currentBranch}</span></Badge>
          )}
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <Button variant="outline" size="icon" onClick={handleCopyUrl} title="Copy GitHub URL" aria-label="Copy GitHub URL" className="h-9 w-9 cursor-pointer rounded-md border-border text-muted-foreground shadow-none">
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="outline" size="sm" asChild className="h-9 gap-2 rounded-md border-border font-mono text-[11px] shadow-none">
            <Link href={`https://github.com/${metadata.fullName}`} target="_blank" rel="noopener noreferrer"><Github className="h-3.5 w-3.5" />GitHub<ArrowUpRight className="h-3 w-3 text-muted-foreground" /></Link>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 border-t border-border bg-muted/10 sm:grid-cols-4">
        {stats.map(({ icon: Icon, value, label }, index) => (
          <div key={label} className={cn("flex items-center gap-3 border-border px-4 py-4 sm:px-5", index < 2 && "border-b sm:border-b-0", index % 2 === 0 && "border-r", index === 1 && "sm:border-r")}>
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground/70" />
            <div>
              <div className="font-mono text-base font-medium tabular-nums text-foreground">{formatNumber(value)}</div>
              <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export { BranchSelector } from "./branch-selector";
