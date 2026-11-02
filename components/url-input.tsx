"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateGitHubUrl } from "@/lib/validators";
import { cn } from "@/lib/utils";
import { Github, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

interface UrlInputProps {
  onAnalyze: (url: string, branch?: string) => void;
  isLoading: boolean;
}

export function UrlInput({ onAnalyze, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateGitHubUrl(url);
    if (!validation.valid) {
      setError(validation.error || "Invalid URL");
      return;
    }
    setError(null);
    onAnalyze(validation.normalizedUrl || url, undefined);
  }, [url, onAnalyze]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (error) setError(null);
  }, [error]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className={cn(
          "overflow-hidden rounded-lg border bg-card transition-colors",
          isFocused ? "border-primary/60 ring-1 ring-primary/15" : "border-border",
          error && "border-destructive/60 ring-1 ring-destructive/15",
        )}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/25 px-4 py-2.5 sm:px-5">
            <label htmlFor="repository-url" className="font-mono text-[11px] font-medium uppercase tracking-wider text-foreground">Repository</label>
            <span className="font-mono text-[10px] text-muted-foreground">GitHub URL / owner/repo</span>
          </div>
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
            <div className="flex min-w-0 flex-1 items-center gap-3 px-1">
              <Github className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                id="repository-url"
                type="text"
                placeholder="github.com/owner/repository"
                value={url}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={isLoading}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "repository-error" : "repository-help"}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="h-11 min-w-0 flex-1 border-0 bg-transparent! px-0 font-mono text-sm shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 md:text-sm"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="h-11 w-full shrink-0 cursor-pointer gap-2 rounded-md px-5 text-xs font-medium shadow-none sm:w-auto"
            >
              {isLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Analyzing repository</> : <>Analyze repository<ArrowRight className="h-3.5 w-3.5" /></>}
            </Button>
          </div>
        </div>
        <AnimatePresence>
          {error && (
            <motion.div id="repository-error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 px-1 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </motion.div>
          )}
        </AnimatePresence>
        <p id="repository-help" className="px-1 font-mono text-[10px] leading-5 text-muted-foreground">
          Paste a repository URL or use <span className="text-foreground">owner/repo</span>. Press Enter to analyze.
        </p>
      </form>
    </motion.div>
  );
}
