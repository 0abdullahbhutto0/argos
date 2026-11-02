"use client";

import { useCallback, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { analysisStorage } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Trash2,
  Star,
  ArrowRight,
  AlertCircle,
  GitBranch,
  Github,
  Network,
  ListChecks,
} from "lucide-react";
import { AnalysisResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RecentAnalysis {
  repoFullName: string;
  branch?: string;
  data: AnalysisResult;
  timestamp: number;
  daysUntilExpiry: number;
  isExpiringSoon: boolean;
}

interface RecentAnalysesProps {
  onSelect: (url: string, branch?: string) => void;
  className?: string;
}

const EXPIRY_DAYS = 7;

function calculateDaysUntilExpiry(timestamp: number, now: number): number {
  const expiryDate = timestamp + EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, differenceInDays(expiryDate, now));
}

function calculateIsExpiringSoon(timestamp: number, now: number): boolean {
  return calculateDaysUntilExpiry(timestamp, now) <= 2;
}

function processHistory(
  rawHistory: {
    repoFullName: string;
    branch?: string;
    data: AnalysisResult;
    timestamp: number;
  }[],
  now: number,
): RecentAnalysis[] {
  return rawHistory.map((item) => ({
    ...item,
    daysUntilExpiry: calculateDaysUntilExpiry(item.timestamp, now),
    isExpiringSoon: calculateIsExpiringSoon(item.timestamp, now),
  }));
}

let listeners: Array<() => void> = [];
let cachedHistory: RecentAnalysis[] | null = null;

function getSnapshot(): RecentAnalysis[] {
  if (cachedHistory === null) {
    const now = Date.now();
    const recent = analysisStorage.getRecent(10);
    cachedHistory = processHistory(recent, now);
  }
  return cachedHistory;
}

const EMPTY_HISTORY: RecentAnalysis[] = [];

function getServerSnapshot(): RecentAnalysis[] {
  return EMPTY_HISTORY;
}

function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notifyListeners() {
  cachedHistory = null;
  listeners.forEach((listener) => listener());
}

function removeFromHistory(repoFullName: string, branch?: string) {
  analysisStorage.remove(repoFullName, branch);
  notifyListeners();
}

function clearAllHistory() {
  analysisStorage.clearAll();
  notifyListeners();
}

export function RecentAnalyses({ onSelect, className }: RecentAnalysesProps) {
  const history = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const handleRemove = useCallback(
    (repoFullName: string, branch: string | undefined, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      removeFromHistory(repoFullName, branch);
    },
    [],
  );

  const handleClearAll = useCallback(() => {
    clearAllHistory();
  }, []);

  const handleSelect = useCallback(
    (repoFullName: string, branch?: string) => {
      onSelect(`https://github.com/${repoFullName}`, branch);
    },
    [onSelect],
  );

  if (history.length === 0) {
    return (
      <Card className={cn("gap-0 overflow-hidden rounded-lg border-border bg-card p-0 shadow-none", className)}>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-4 py-3 sm:px-5">
          <CardTitle className="font-mono text-xs font-medium text-foreground">Start your first inspection</CardTitle>
          <p className="text-[11px] text-muted-foreground">Recent analyses will appear here.</p>
        </CardHeader>
        <CardContent className="p-0">
          <ol className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <li className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <Github className="h-4 w-4 text-primary" />
                <span className="font-mono text-[10px] text-muted-foreground">01 / CONNECT</span>
              </div>
              <h3 className="text-sm font-medium text-foreground">Choose a repository</h3>
              <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">Paste a GitHub URL or owner/repo above. Argos scans its structure and builds your inspection workspace.</p>
            </li>
            <li className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <Network className="h-4 w-4 text-primary" />
                <span className="font-mono text-[10px] text-muted-foreground">02 / EXPLORE</span>
              </div>
              <h3 className="text-sm font-medium text-foreground">Follow the connections</h3>
              <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">Explore the architecture and dependency map. Select a module to inspect what it calls and what depends on it.</p>
            </li>
            <li className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <ListChecks className="h-4 w-4 text-primary" />
                <span className="font-mono text-[10px] text-muted-foreground">03 / ACT</span>
              </div>
              <h3 className="text-sm font-medium text-foreground">Turn findings into action</h3>
              <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">Review suggested issues, refactors, and automations. Prioritize the changes that matter to your codebase.</p>
            </li>
          </ol>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("w-full", className)}
    >
      <Card className="gap-0 overflow-hidden rounded-lg border-border bg-card p-0 shadow-none">
        <CardHeader className="border-b border-border bg-muted/20 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-mono text-xs font-medium text-foreground">
              <Clock className="w-4 h-4 text-primary" />
              Recently Analyzed
              <span className="flex items-center justify-center px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-mono font-medium">
                {history.length}
              </span>
            </CardTitle>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-xs h-7 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear all
            </Button>
          </div>

          <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/50">
            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Cache expires after{" "}
              <span className="text-foreground font-medium">
                {EXPIRY_DAYS} days
              </span>
              . Click refresh on any analysis to update.
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <AnimatePresence mode="popLayout">
              {history.map(
                (
                  {
                    repoFullName,
                    branch,
                    data,
                    timestamp,
                    daysUntilExpiry,
                    isExpiringSoon,
                  },
                  index,
                ) => (
                  <motion.div
                    key={`${repoFullName}${branch ? `:${branch}` : ""}`}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.15, delay: index * 0.02 }}
                  >
                    <div
                      onClick={() => handleSelect(repoFullName, branch)}
                      className={cn(
                        "group relative p-3 rounded-lg text-left cursor-pointer",
                        "border bg-card hover:bg-muted/40",
                        "transition-all duration-150 h-full",
                        isExpiringSoon
                          ? "border-amber-500/30"
                          : "border-border/70 hover:border-border",
                      )}
                    >
                      {/* Expiry Badge */}
                      {isExpiringSoon && (
                        <div className="absolute -top-2 left-3 z-10">
                          <Badge
                            variant="outline"
                            className="text-[9px] h-4 px-1.5 bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono"
                          >
                            {daysUntilExpiry === 0
                              ? "Expires today"
                              : `${daysUntilExpiry}d left`}
                          </Badge>
                        </div>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleRemove(repoFullName, branch, e)}
                        className={cn(
                          "absolute top-2 right-2 p-1 cursor-pointer rounded-md z-10",
                          "opacity-0 group-hover:opacity-100",
                          "hover:bg-muted text-muted-foreground hover:text-foreground transition-all",
                        )}
                        aria-label={`Remove ${repoFullName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Repo Info */}
                      <div
                        className={cn(
                          "flex items-start gap-2.5 pr-5",
                          isExpiringSoon && "mt-1",
                        )}
                      >
                        {data.metadata?.owner?.avatarUrl ? (
                          <Image
                            src={data.metadata.owner.avatarUrl}
                            alt={data.metadata.owner.login}
                            width={36}
                            height={36}
                            className="rounded-md border border-border/60 shrink-0 object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-primary">
                              {repoFullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                            {data.metadata?.name ||
                              repoFullName.split("/")[1]}
                          </p>
                          <p className="text-xs text-muted-foreground truncate font-mono">
                            @{repoFullName.split("/")[0]}
                          </p>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap font-mono">
                        {data.metadata?.stars !== undefined && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] gap-1 px-1.5 h-4.5"
                          >
                            <Star className="w-2.5 h-2.5 text-muted-foreground" />
                            {data.metadata.stars.toLocaleString()}
                          </Badge>
                        )}
                        {branch && (
                          <Badge
                            variant="outline"
                            className="text-[10px] gap-1 px-1.5 h-4.5"
                          >
                            <GitBranch className="w-2.5 h-2.5" />
                            {branch}
                          </Badge>
                        )}
                        {!branch && data.metadata?.language && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 h-4.5"
                          >
                            {data.metadata.language}
                          </Badge>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/40">
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {formatDistanceToNow(timestamp, {
                            addSuffix: true,
                          })}
                        </p>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </motion.div>
                ),
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
