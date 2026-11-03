"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateGitHubUrl } from "@/lib/validators";
import { cn } from "@/lib/utils";
import {
  Github,
  ArrowRight,
  AlertCircle,
  Search,
  Loader2,
} from "lucide-react";

interface UrlInputProps {
  onAnalyze: (url: string, branch?: string) => void;
  isLoading: boolean;
}

export function UrlInput({ onAnalyze, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const validation = validateGitHubUrl(url);
      if (!validation.valid) {
        setError(validation.error || "Invalid URL");
        return;
      }

      setError(null);
      onAnalyze(validation.normalizedUrl || url, undefined);
    },
    [url, onAnalyze]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUrl(e.target.value);
      if (error) setError(null);
    },
    [error]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="w-full max-w-2xl mx-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div
          className={cn(
            "relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 p-1.5 sm:p-2 rounded-xl border bg-card/90 shadow-xs transition-all duration-200",
            isFocused
              ? "border-primary/60 ring-2 ring-primary/20"
              : "border-border/80 hover:border-border",
            error && "border-destructive/60 ring-1 ring-destructive/20"
          )}
        >
          <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-muted/60 shrink-0">
            <Github className="w-5 h-5 text-muted-foreground" />
          </div>

          <div className="flex-1 flex items-center min-w-0">
            <Input
              type="text"
              placeholder="owner/repo or github.com/owner/repo"
              value={url}
              onChange={handleChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isLoading}
              className={cn(
                "flex-1 border-0 bg-transparent shadow-none h-11 outline-none",
                "text-sm sm:text-base font-mono",
                "placeholder:text-muted-foreground/45 placeholder:font-sans",
                "focus-visible:ring-0 focus-visible:ring-offset-0 px-2 sm:px-1"
              )}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !url.trim()}
            className={cn(
              "rounded-lg h-10 px-4 text-sm font-medium shrink-0 w-full sm:w-auto",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "transition-all duration-150 cursor-pointer shadow-xs"
            )}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span>Analyze</span>
                <ArrowRight className="w-3.5 h-3.5 hidden sm:block opacity-70" />
              </div>
            )}
          </Button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 text-destructive text-xs sm:text-sm px-3 font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground/60 text-center px-4">
          Enter a GitHub repository (e.g. <span className="font-mono text-muted-foreground">facebook/react</span>) or full URL
        </p>
      </form>
    </motion.div>
  );
}
