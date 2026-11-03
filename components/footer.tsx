import Link from "next/link";
import ArgosLogo from "./icons/Argos-logo";

export function Footer() {
  return (
    <footer className="relative z-10 bg-background w-full border-t border-border/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 py-10 md:py-12">
          <div className="space-y-3 max-w-sm">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <ArgosLogo className="h-6 w-auto sm:h-7 shrink-0" />
              <span className="font-semibold text-lg tracking-tight text-foreground">
                Argos
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Explore your repositories with clear architecture and dependency maps.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/terms"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/60 py-6">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            © {new Date().getFullYear()} Argos. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
