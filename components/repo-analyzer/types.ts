import { LucideIcon } from "lucide-react";

export interface SectionHeaderProps {
  title: string;
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}
