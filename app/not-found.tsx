"use client";

import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const NotFoundPage = () => {
  const router = useRouter();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full text-center space-y-4">
          {/* 404 Visual */}
          <div className="relative mx-auto mb-4">
            <h1 className="text-8xl sm:text-9xl font-mono font-bold tracking-tighter text-muted-foreground/15 select-none">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-card px-3.5 py-1.5 rounded-lg border border-border shadow-xs">
                <span className="text-xs sm:text-sm font-mono font-medium text-muted-foreground">
                  #page-not-found
                </span>
              </div>
            </div>
          </div>

          {/* Message */}
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            This page doesn&apos;t exist
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            The page you&apos;re looking for might have been moved, deleted, or never existed.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <Button asChild variant="default" className="w-full sm:w-auto h-9">
              <Link href="/" className="gap-2">
                <Home className="size-4" />
                Go to Home
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto gap-2 h-9"
              onClick={handleGoBack}
            >
              <ArrowLeft className="size-4" />
              Go Back
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 px-4 sm:px-6 py-4">
        <p className="text-center text-xs text-muted-foreground">
          Lost? Return to the home page to analyze a repository.
        </p>
      </footer>
    </div>
  );
};

export default NotFoundPage;
