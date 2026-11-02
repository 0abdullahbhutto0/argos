import { TabsTrigger } from "@/components/ui/tabs";
import { TabTriggerItemProps } from "./types";

export function TabTriggerItem({ value, icon: Icon, label, count }: TabTriggerItemProps) {
  return (
    <TabsTrigger value={value} className="h-9 cursor-pointer gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 font-mono text-[11px] font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none sm:px-4">
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
      {count !== undefined && count > 0 && <span className="ml-1 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[9px] font-normal tabular-nums text-muted-foreground">{count}</span>}
    </TabsTrigger>
  );
}
