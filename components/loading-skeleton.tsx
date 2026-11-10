"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StreamingAnalysis } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const LOADING_QUOTES = [
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "Clean code always looks like it was written by someone who cares.", author: "Robert C. Martin" },
  { text: "Programming isn't about what you know; it's about what you can figure out.", author: "Chris Pine" },
  { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
  { text: "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", author: "Antoine de Saint-Exupery" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { text: "Before software can be reusable it first has to be usable.", author: "Ralph Johnson" },
  { text: "The only way to go fast, is to go well.", author: "Robert C. Martin" },
  { text: "Measuring programming progress by lines of code is like measuring aircraft building progress by weight.", author: "Bill Gates" },
  { text: "It's not a bug; it's an undocumented feature.", author: "Anonymous" },
  { text: "Good software, like wine, takes time.", author: "Joel Spolsky" },
  { text: "Deleted code is debugged code.", author: "Jeff Sickel" },
  { text: "Computers are fast; developers keep it slow.", author: "Anonymous" },
  { text: "A primary cause of complexity is that software vendors uncritically adopt almost any feature that users want.", author: "Niklaus Wirth" },
  { text: "Don't comment bad code — rewrite it.", author: "Brian Kernighan" },
  { text: "Debugging is twice as hard as writing the code in the first place.", author: "Brian Kernighan" },
];

function useRotatingQuote(intervalMs: number = 9000) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * LOADING_QUOTES.length));
  const next = useCallback(() => {
    setIndex((prev) => {
      let nextIdx: number;
      do {
        nextIdx = Math.floor(Math.random() * LOADING_QUOTES.length);
      } while (nextIdx === prev && LOADING_QUOTES.length > 1);
      return nextIdx;
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(next, intervalMs);
    return () => clearInterval(timer);
  }, [next, intervalMs]);

  return LOADING_QUOTES[index];
}

interface LoadingSkeletonProps {
  status: StreamingAnalysis;
}

function useElapsedSeconds(stage: string): number {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (stage === "fetching" || stage === "analyzing") {
      startRef.current = Date.now();
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
      const timeout = setTimeout(() => setElapsed(0), 0);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [stage]);

  return elapsed;
}

interface ApologyMessage {
  emoji: string;
  text: string;
}

const APOLOGY_MESSAGES: { after: number; message: ApologyMessage }[] = [
  { after: 15, message: { emoji: "🙏", text: "Taking a closer look at your codebase. We're mapping out how everything fits together!"
    }
  },
  {
    after: 30,
    message: {
      emoji: "💛",
      text: "Connecting the dots! We're tracing dependencies and identifying how different parts of your project interact."
    }
  },
  {
    after: 50,
    message: {
      emoji: "🫶",
      text: "There's quite a bit to unpack. We're putting together your architecture and dependency graph."
    }
  },
  {
    after: 75,
    message: {
      emoji: "☕",
      text: "Still working through your repository. Complex codebases take a little more digging — thanks for hanging in there!"
    }
  },
  {
    after: 100,
    message: {
      emoji: "🌟",
      text: "Almost ready! We're putting the final pieces together. Thanks for giving Argos a moment!"
    }
  }
]


function getApologyMessage(elapsedSeconds: number): ApologyMessage | null {
  let result: ApologyMessage | null = null;
  for (const entry of APOLOGY_MESSAGES) {
    if (elapsedSeconds >= entry.after) result = entry.message;
  }
  return result;
}

function useSmoothProgress(target: number, isComplete: boolean): number {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef<number>(0);
  const displayRef = useRef(target);
  const targetRef = useRef(target);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    if (isComplete) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const current = displayRef.current;
      const t = targetRef.current;
      const gap = t - current;
      if (gap > 0.1) {
        displayRef.current = Math.min(current + Math.max(gap * 2.5 * dt, 0.05 * dt), t);
      } else if (t >= 50 && t < 99) {
        const ceiling = Math.min(t + 3, 98.5);
        if (current < ceiling) displayRef.current = Math.min(current + 0.3 * dt, ceiling);
      }
      setDisplay(displayRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isComplete]);

  return isComplete ? 100 : display;
}

export function LoadingSkeleton({ status }: LoadingSkeletonProps) {
  const quote = useRotatingQuote(9000);
  const smoothProgress = useSmoothProgress(status.progress, status.stage === "complete");
  const elapsed = useElapsedSeconds(status.stage);
  const apologyMessage = getApologyMessage(elapsed);

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10 w-full max-w-full overflow-hidden">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4 px-4">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 shadow-sm">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm font-medium text-primary whitespace-nowrap">{status.currentStep}</span>
        </div>
        <div className="w-full max-w-xs space-y-2">
          <Progress value={smoothProgress} className="h-1.5" />
          <p className="text-[10px] sm:text-xs text-muted-foreground text-center tabular-nums">{Math.round(smoothProgress)}% complete</p>
        </div>
        <AnimatePresence mode="wait">
          {apologyMessage && (
            <motion.div key={apologyMessage.text} initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.5, ease: "easeOut" }} className="max-w-sm text-center px-4 py-3 rounded-xl bg-amber-500/5 dark:bg-amber-400/5 border border-amber-500/15 dark:border-amber-400/10">
              <p className="text-xs sm:text-[13px] leading-relaxed text-amber-800/80 dark:text-amber-300/80">
                <span className="mr-1">{apologyMessage.emoji}</span>{apologyMessage.text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.blockquote key={quote.text} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.4, ease: "easeInOut" }} className="max-w-sm text-center mt-1">
            <p className="text-[13px] leading-relaxed italic text-muted-foreground/80">&ldquo;{quote.text}&rdquo;</p>
            <footer className="mt-1.5 text-[11px] font-medium text-muted-foreground/60">&mdash; {quote.author}</footer>
          </motion.blockquote>
        </AnimatePresence>
      </motion.div>
      <AnalysisHeaderSkeleton />
      <div className="space-y-3">
        <SectionHeaderSkeleton title="w-24 sm:w-28" icon />
        <ArchitectureSkeleton />
      </div>
      <div className="space-y-3">
        <SectionHeaderSkeleton title="w-28 sm:w-32" icon />
        <DependencyMapSkeleton />
      </div>
    </div>
  );
}

function SectionHeaderSkeleton({ title, icon = false }: { title: string; icon?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-1">
      {icon && <Skeleton className="w-6 h-6 sm:w-7 sm:h-7 rounded-md shrink-0" />}
      <Skeleton className={cn("h-5", title)} />
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

function AnalysisHeaderSkeleton() {
  return (
    <Card className="border-border/60 overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex gap-4">
          <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-6 w-48 max-w-[70%]" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="hidden sm:flex gap-2 shrink-0">
            <Skeleton className="w-8 h-8 rounded-md" />
            <Skeleton className="w-20 h-8 rounded-md" />
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <Skeleton className="h-4 w-full sm:w-3/4" />
          <Skeleton className="h-4 w-2/3 sm:w-1/2" />
        </div>
        <div className="flex gap-2 mt-4 overflow-hidden">
          <Skeleton className="h-6 w-20 rounded-md shrink-0" />
          <Skeleton className="h-6 w-16 rounded-md shrink-0" />
          <Skeleton className="h-6 w-28 rounded-md shrink-0" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20 border-border/40">
              <Skeleton className="w-8 h-8 rounded-md shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-3 w-full max-w-16" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex sm:hidden gap-2 mt-4">
          <Skeleton className="w-8 h-8 rounded-md" />
          <Skeleton className="flex-1 h-8 rounded-md" />
        </div>
      </div>
    </Card>
  );
}

function ArchitectureSkeleton() {
  return (
    <Card className="border-border/60">
      <CardHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-md shrink-0" />
          <Skeleton className="h-5 w-40" />
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-8">
        {[1, 2].map(layer => (
          <div key={layer} className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-md shrink-0" />
              <Skeleton className="h-5 w-24" />
              <div className="flex-1 h-px bg-border/50" />
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:ml-9">
              {[1, 2, 3].map(card => (
                <div key={card} className="p-4 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-5 w-14 rounded" />
                    <Skeleton className="h-5 w-16 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DependencyMapSkeleton() {
  return (
    <Card className="border-border/60 overflow-hidden">
      <CardHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-md shrink-0" />
          <Skeleton className="h-5 w-40" />
        </div>
      </CardHeader>
      <CardContent className="h-125 flex items-center justify-center gap-2 bg-muted/10">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Preparing dependency map...</span>
      </CardContent>
    </Card>
  );
}
