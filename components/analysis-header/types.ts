import { LucideIcon } from "lucide-react";
import { RepoMetadata, BranchInfo } from "@/lib/types";

export interface AnalysisHeaderProps {
  metadata: RepoMetadata;
  branch?: string;
  availableBranches?: BranchInfo[];
  onBranchChange?: (branch: string) => void;
  isLoading?: boolean;
}

export interface StatItem {
  icon: LucideIcon;
  value: number;
  label: string;
  highlight: boolean;
}

export interface BranchSelectorProps {
  currentBranch: string;
  branches: BranchInfo[];
  onBranchChange: (branch: string) => void;
  disabled?: boolean;
  fullWidth?: boolean;
}
