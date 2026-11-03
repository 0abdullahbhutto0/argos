import { SectionHeaderProps } from "./types";

export function SectionHeader({ title, icon: Icon }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2.5">
      {Icon && (
        <div className="p-1.5 rounded-md bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      )}
      <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="flex-1 h-px bg-border/70" />
    </div>
  );
}
