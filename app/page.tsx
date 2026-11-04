"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Footer } from "@/components/footer";
import { HeroHeader } from "@/components/header";
import { RepoAnalyzer } from "@/components/repo-analyzer";
import { useAnalysis } from "@/hooks/use-analysis";

function HomeContent() {
  const searchParams = useSearchParams();
  const { analyze } = useAnalysis();

  useEffect(() => {
    const repoParam = searchParams.get("repo");
    const branchParam = searchParams.get("branch");

    if (repoParam) {
      analyze(repoParam, branchParam || undefined);
    }
  }, [searchParams, analyze]);

  return (
    <div className="w-full relative min-h-screen flex flex-col bg-background">
      {/* Subtle calm background grid pattern */}
      <div className="fixed inset-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(56,189,248,0.06),transparent_70%)]" />
      </div>

      {/* Main Content */}
      <main className="flex flex-col relative flex-1">
        {/* Header spacer */}
        <div className="pb-20 sm:pb-24">
          <HeroHeader />
        </div>

        {/* Hero Section */}
        <section className="relative flex-1">
          <div className="mx-auto px-3 sm:px-5 lg:px-6">
            <div className="flex flex-col items-center py-6 sm:py-8 text-center">
              <div className="instrument-serif flex flex-col gap-1.5 px-4 text-4xl sm:text-6xl lg:text-7xl tracking-tight">
                <h1 className="text-muted-foreground/60 dark:text-muted-foreground/50">
                  Understand{" "}
                  <span className="text-foreground">
                    Any
                  </span>{" "}
                  Codebase
                </h1>
                <h2 className="text-muted-foreground/60 dark:text-muted-foreground/50 -mt-1">
                  <span className="relative inline-block">
                    <span className="text-foreground relative z-10">
                      In Seconds
                    </span>
                    {/* Hand-crafted underline SVG */}
                    <svg
                      className="absolute -bottom-1.5 sm:-bottom-2 w-full h-1.5 sm:h-2.5 left-0 text-primary z-0"
                      viewBox="0 0 100 10"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M2 5.5C15 3.5 45 2.5 60 4.5C75 6.5 90 8 98 5"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  {", Not in Hours."}
                </h2>
              </div>
            </div>

            {/* Analyzer Component Container */}
            <div className="relative pb-16 sm:pb-20 lg:pb-24">
              <div className="relative mx-auto max-w-4xl">
                <RepoAnalyzer />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HomeContent />
    </Suspense>
  );
}
