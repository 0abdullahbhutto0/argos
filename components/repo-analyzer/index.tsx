"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UrlInput } from "@/components/url-input";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { DependencyGraph } from "@/components/dependency-graph";
import { AnalysisHeader } from "@/components/analysis-header";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { useAnalysis } from "@/hooks/use-analysis";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, RotateCcw, GitBranch, Workflow } from "lucide-react";
import { fadeIn, slideUp } from "./animations";
import { SectionHeader } from "./section-header";
import { EmptyState } from "./empty-state";

export function RepoAnalyzer() {
  const {
    analyze,
    analyzeBranch,
    status,
    result,
    reset,
    retry,
    isLoading,
    isComplete,
    hasError,
    currentBranch,
    currentRepoUrl,
  } = useAnalysis();

  const handleReset = () => {
    reset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="w-full">
      <div className="space-y-6 sm:space-y-8">
        <section className="w-full">
          <UrlInput onAnalyze={analyze} isLoading={isLoading} />
        </section>

        <AnimatePresence mode="wait">
          {hasError && (
            <motion.section
              key="error"
              role="alert"
              variants={slideUp}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <Card className="border-destructive/30 bg-destructive/5 shadow-xs">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col items-center text-center max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                      <AlertCircle className="w-6 h-6 text-destructive" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1.5">Analysis Failed</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-5 leading-relaxed">
                      {status.error || "Something went wrong while analyzing the repository."}
                    </p>
                    <Button onClick={currentRepoUrl ? retry : handleReset} variant="outline" className="border-border hover:bg-muted cursor-pointer">
                      <RotateCcw className="w-3.5 h-3.5 mr-2" />
                      Try Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          )}

          {isLoading && (
            <motion.section
              key="loading"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <LoadingSkeleton status={status} />
            </motion.section>
          )}

          {isComplete && result?.metadata && (
            <motion.div
              key="results"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.2 }}
              className="space-y-6 sm:space-y-8"
            >
              <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="w-full">
                <AnalysisHeader
                  metadata={result.metadata}
                  branch={result.branch || currentBranch}
                  availableBranches={result.availableBranches}
                  onBranchChange={analyzeBranch}
                  isLoading={isLoading}
                />
              </motion.section>

              <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }} className="w-full">
                <SectionHeader title="Architecture" icon={GitBranch} />
                <div className="mt-3.5">
                  {result.architecture && result.architecture.length > 0 ? (
                    <ArchitectureDiagram components={result.architecture} />
                  ) : (
                    <EmptyState icon={GitBranch} title="No Architecture Data" description="Architecture visualization is not available for this repository." />
                  )}
                </div>
              </motion.section>

              {result.dependencyGraph?.nodes && result.dependencyGraph.nodes.length > 0 && (
                <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }} className="w-full">
                  <SectionHeader title="Dependency Map" icon={Workflow} />
                  <div className="mt-3.5">
                    <DependencyGraph nodes={result.dependencyGraph.nodes} edges={result.dependencyGraph.edges || []} />
                  </div>
                </motion.section>
              )}

              <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 0.15 }} className="w-full flex justify-center pt-2 pb-6">
                <Button onClick={handleReset} variant="outline" size="default" className={cn("group cursor-pointer", "border-border/80 hover:border-border", "hover:bg-muted/50", "transition-all duration-150")}>
                  <RotateCcw className="w-4 h-4 mr-2 text-muted-foreground group-hover:text-foreground transition-all" />
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">Analyze Another Repository</span>
                </Button>
              </motion.section>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
