import { SectionHeaderProps } from "./types";

export function SectionHeader({ title, icon: Icon }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2.5">
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-primary/80" />}
      <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-foreground">{title}</h2>
      <div className="ml-2 h-px flex-1 bg-border" />
    </div>
  );
}
