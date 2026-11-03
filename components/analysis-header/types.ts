import { LucideIcon } from "lucide-react";
import { RepoMetadata, BranchInfo } from "@/lib/types";

export interface AnalysisHeaderProps {
  metadata: RepoMetadata;
  branch?: string;
  availableBranches?: BranchInfo[];
  onBranchChange?: (branch: string) => void;
  isLoading?: boolean;
}

export interface InfoSectionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accentColor?: AccentColor;
  count?: number;
  children: React.ReactNode;
}

export interface StatItem {
  icon: LucideIcon;
  value: number;
  label: string;
  highlight: boolean;
}

export type AccentColor = "primary" | "blue" | "green" | "purple" | "orange" | "cyan";

export interface ColorClasses {
  iconBg: string;
  iconText: string;
}

export interface BranchSelectorProps {
  currentBranch: string;
  branches: BranchInfo[];
  onBranchChange: (branch: string) => void;
  disabled?: boolean;
  fullWidth?: boolean;
}
