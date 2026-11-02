"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MotionConfig } from "framer-motion";
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
    if (repoParam) analyze(repoParam, branchParam || undefined);
  }, [searchParams, analyze]);

  return (
    <div className="workspace-background relative isolate flex min-h-screen w-full flex-col">
      <div aria-hidden="true" className="workspace-decoration pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden xl:block">
        <div className="workspace-grid absolute inset-0" />
        <div className="workspace-gutter absolute inset-y-0 left-0">
          <svg className="workspace-traces h-full w-full text-primary" viewBox="0 0 260 900" fill="none" preserveAspectRatio="xMinYMid slice" focusable="false">
            <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M24 0V142L72 190V326L122 376V510L74 558V716L126 768V900" />
              <path d="M72 0V102L120 150V278L170 328V466L122 514V674L174 726V900" />
              <path d="M0 248H36L78 290V416L36 458H0M0 604H48L94 650V802L48 848H0" />
              <path d="M132 0V72L178 118V218M174 900V820L214 780V632" />
              <circle cx="72" cy="190" r="4" />
              <circle cx="170" cy="328" r="4" />
              <circle cx="74" cy="558" r="4" />
              <circle cx="214" cy="632" r="4" />
            </g>
          </svg>
        </div>
      </div>
      <main className="relative flex flex-1 flex-col">
        <div className="pb-20 sm:pb-24">
          <HeroHeader />
        </div>
        <section className="relative flex-1" aria-labelledby="workspace-heading">
          <div className="mx-auto px-3 sm:px-5 lg:px-6">
            <div className="flex flex-col items-center py-6 text-center sm:py-8">
              <div className="instrument-serif flex flex-col gap-1.5 px-4 text-4xl tracking-tight sm:text-6xl lg:text-7xl">
                <h1 id="workspace-heading" className="text-muted-foreground/60 dark:text-muted-foreground/50">
                  Understand <span className="text-foreground">Any</span> Codebase
                </h1>
                <h2 className="-mt-1 text-muted-foreground/60 dark:text-muted-foreground/50">
                  <span className="relative inline-block">
                    <span className="relative z-10 text-foreground">In Seconds</span>
                    <svg className="absolute -bottom-1.5 left-0 z-0 h-1.5 w-full text-primary sm:-bottom-2 sm:h-2.5" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M2 5.5C15 3.5 45 2.5 60 4.5C75 6.5 90 8 98 5" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    </svg>
                  </span>
                  {", Not in Hours."}
                </h2>
              </div>
            </div>
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
  return <Suspense fallback={<div className="min-h-screen bg-background" />}><MotionConfig reducedMotion="user"><HomeContent /></MotionConfig></Suspense>;
}
