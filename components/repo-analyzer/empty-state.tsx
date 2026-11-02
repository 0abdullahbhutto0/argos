import { Card, CardContent } from "@/components/ui/card";
import { EmptyStateProps } from "./types";

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <Card className="gap-0 rounded-lg border-dashed border-border bg-card p-0 shadow-none">
      <CardContent className="flex flex-col items-center px-5 py-10 text-center sm:py-12">
        <Icon className="mb-3 h-5 w-5 text-muted-foreground/60" />
        <h3 className="mb-1 font-mono text-xs font-medium text-foreground">{title}</h3>
        <p className="max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
