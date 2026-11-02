"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StreamingAnalysis } from "@/lib/types";
import { Loader2, Clock3 } from "lucide-react";

interface LoadingSkeletonProps {
  status: StreamingAnalysis;
}

function useElapsedSeconds(stage: string): number {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  useEffect(() => {
    if (stage === "fetching" || stage === "analyzing") {
      startRef.current = Date.now();
      const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
      const timeout = setTimeout(() => setElapsed(0), 0);
      return () => { clearInterval(interval); clearTimeout(timeout); };
    }
  }, [stage]);
  return elapsed;
}

function useSmoothProgress(target: number, isComplete: boolean): number {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef<number>(0);
  const displayRef = useRef(target);
  const targetRef = useRef(target);
  useEffect(() => { targetRef.current = target; }, [target]);
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
  const progress = useSmoothProgress(status.progress, status.stage === "complete");
  const elapsed = useElapsedSeconds(status.stage);
  return (
    <div className="w-full space-y-7" aria-busy="true">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-primary/20 bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <div>
              <p className="font-mono text-[11px] font-medium text-foreground" role="status">{status.currentStep}</p>
              <p className="mt-1 text-xs text-muted-foreground">Reading the codebase and preparing your workspace.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Clock3 className="h-3 w-3" />{elapsed}s</span>
            <span className="text-primary">{Math.round(progress)}%</span>
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
        {elapsed >= 15 && <p className="mt-3 text-[11px] text-muted-foreground">Analysis can take longer on free-tier infrastructure. Your request is still processing.</p>}
      </motion.div>

      <Card className="gap-0 overflow-hidden rounded-lg border-border p-0 shadow-none">
        <div className="flex items-center gap-3.5 p-5">
          <Skeleton className="h-11 w-11 rounded-md" />
          <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div>
          <Skeleton className="ml-auto hidden h-8 w-28 rounded-md sm:block" />
        </div>
        <div className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="space-y-2 p-4 sm:p-5"><Skeleton className="h-4 w-16" /><Skeleton className="h-2.5 w-12" /></div>)}
        </div>
      </Card>

      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Card className="gap-0 rounded-lg border-border p-5 shadow-none">
          <Skeleton className="mb-5 h-3 w-36" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => <div key={item} className="space-y-3 rounded-md border border-border p-4"><Skeleton className="h-3 w-24" /><Skeleton className="h-2.5 w-full" /><Skeleton className="h-2.5 w-4/5" /><Skeleton className="h-4 w-20 rounded-sm" /></div>)}
          </div>
        </Card>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-44" />
        <Card className="gap-0 rounded-lg border-border p-5 shadow-none">
          <div className="mb-5 flex gap-4"><Skeleton className="h-6 w-20" /><Skeleton className="h-6 w-24" /><Skeleton className="h-6 w-20" /></div>
          <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="flex items-center gap-3 rounded-md border border-border p-4"><Skeleton className="h-5 w-5 rounded-sm" /><Skeleton className="h-3 w-1/2" /><Skeleton className="ml-auto h-4 w-12 rounded-sm" /></div>)}</div>
        </Card>
      </div>
    </div>
  );
}
