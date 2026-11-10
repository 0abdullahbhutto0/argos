"use client";

import { useCallback, useState, useRef } from "react";
import { useAnalysisContext } from "@/context/analysis-context";
import { AnalysisResult } from "@/lib/types";

const GITHUB_URL_REGEX =
  /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+\/[^\/\s?#]+)/;
const SIMPLE_REPO_REGEX = /^([^\/\s]+\/[^\/\s]+)$/;

function extractRepoFullName(url: string): string | null {
  const match = url.match(GITHUB_URL_REGEX);
  if (match) return match[1].replace(/\.git$/, "");
  const simple = url.trim().match(SIMPLE_REPO_REGEX);
  return simple ? simple[1] : null;
}

const LOADING_MESSAGES = [
  "Scanning repository...",
  "Analyzing patterns...",
  "Checking architecture...",
  "Mapping dependencies...",
  "Connecting modules...",
  "Preparing architecture...",
  "Preparing results...",
  "Finalizing analysis...",
];

export function useAnalysis() {
  const {
    status,
    result,
    setStatus,
    setResult,
    updateResult,
    reset: contextReset,
    isLoading,
    isComplete,
    hasError,
  } = useAnalysisContext();

  const [currentRepoUrl, setCurrentRepoUrl] = useState<string | null>(null);
  const [currentBranch, setCurrentBranch] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(
    async (url: string, branch?: string) => {
      const repoFullName = extractRepoFullName(url);
      if (!repoFullName) {
        setStatus({
          stage: "error",
          progress: 0,
          currentStep: "",
          error: "Invalid GitHub URL",
        });
        return;
      }

      abortRef.current?.abort();
      setCurrentRepoUrl(url);
      setCurrentBranch(branch);

      setStatus({
        stage: "fetching",
        progress: 5,
        currentStep: "Connecting...",
      });
      setResult(null);
      abortRef.current = new AbortController();

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ url, branch }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Analysis failed");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let aiContent = "";
        let currentResult: Partial<AnalysisResult> = {};
        let receivedDone = false;

        setStatus({
          stage: "fetching",
          progress: 15,
          currentStep: "Fetching data...",
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case "metadata": {
                  const {
                    metadata,
                    branch: b,
                    availableBranches,
                  } = data.data;
                  currentResult = {
                    metadata,
                    branch: b,
                    availableBranches,
                  };
                  setCurrentBranch(b);
                  updateResult(currentResult);
                  setStatus({
                    stage: "analyzing",
                    progress: 30,
                    currentStep: `Analyzing ${b}...`,
                  });
                  break;
                }
                case "content":
                  aiContent += data.data;
                  // Asymptotic progress: starts fast, slows near 98%.
                  // Never hard-caps, so the bar always keeps moving.
                  const len = aiContent.length;
                  const contentProgress = 50 + 48 * (1 - Math.exp(-len / 4000));
                  const msgIdx = Math.min(
                    Math.floor(len / 600),
                    LOADING_MESSAGES.length - 1,
                  );
                  setStatus({
                    stage: "analyzing",
                    progress: Math.min(contentProgress, 98),
                    currentStep: LOADING_MESSAGES[msgIdx],
                  });
                  break;
                case "error":
                  throw new Error(data.data);
                case "done": {
                  if (!currentResult.metadata) {
                    throw new Error("The analysis response is missing repository information. Please try again.");
                  }
                  const final = processFinalResult(aiContent, currentResult);
                  receivedDone = true;

                  updateResult(final);
                  setStatus({
                    stage: "complete",
                    progress: 100,
                    currentStep: "Complete!",
                  });
                  break;
                }
              }
            } catch (error) {
              if (error instanceof Error && error.message !== "done")
              console.error("Parse error:", error);
            }
          }
        }
        if (!receivedDone) {
          throw new Error("The model response ended before analysis finished. Please try again.");
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setStatus({
          stage: "error",
          progress: 0,
          currentStep: "",
          error: error instanceof Error ? error.message : "Analysis failed",
        });
      } finally {
        abortRef.current = null;
      }
    },
    [setStatus, setResult, updateResult],
  );

  const analyzeBranch = useCallback(
    async (branch: string) => {
      if (currentRepoUrl) await analyze(currentRepoUrl, branch);
    },
    [currentRepoUrl, analyze],
  );

  const retry = useCallback(async () => {
    if (currentRepoUrl) await analyze(currentRepoUrl, currentBranch);
  }, [currentRepoUrl, currentBranch, analyze]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    contextReset();
    setCurrentRepoUrl(null);
    setCurrentBranch(undefined);
  }, [contextReset]);

  return {
    analyze,
    analyzeBranch,
    retry,
    reset,
    status,
    result,
    isLoading,
    isComplete,
    hasError,
    currentRepoUrl,
    currentBranch,
  };
}

function processFinalResult(
  aiContent: string,
  current: Partial<AnalysisResult>,
): Partial<AnalysisResult> {
  try {
    if (!aiContent.trim()) {
        throw new Error("The AI service finished without returning an analysis. Please try again.");
      }
    const match = aiContent.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Missing JSON");
    
      const data = JSON.parse(match[0]);
      return {
        ...current,
        architecture: data.architecture || [],
        dependencyGraph: data.dependencyGraph || { nodes: [], edges: [] },
       
      };
    
  } catch (e) {
    console.error("Parse error:", e);
  }

  return {
    ...current,
    architecture: [],
    dependencyGraph: { nodes: [], edges: [] },
  };
}
