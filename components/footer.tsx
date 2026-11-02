import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col justify-between gap-3 px-4 py-4 font-mono text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/" className="font-medium tracking-wider text-foreground">ARGOS</Link>
          <span>Codebase clarity, built for engineers.</span>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <span>© {new Date().getFullYear()} Argos</span>
          <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
