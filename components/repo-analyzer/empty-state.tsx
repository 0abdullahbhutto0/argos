import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EmptyStateProps } from "./types";

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <Card className="border-border/70 bg-muted/20">
      <CardContent className="py-12 sm:py-16">
        <div className="flex flex-col items-center text-center max-w-sm mx-auto">
          <div
            className={cn(
              "w-12 h-12 rounded-lg mb-4",
              "bg-muted/60 border border-border/60",
              "flex items-center justify-center"
            )}
          >
            <Icon className="w-5 h-5 text-muted-foreground/60" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground mb-1">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
