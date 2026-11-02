export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  size?: number;
}

export interface BranchInfo {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
  isDefault: boolean;
}

export interface RepoMetadata {
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  watchers: number;
  language: string | null;
  topics: string[];
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  size: number;
  openIssues: number;
  license: string | null;
  isPrivate: boolean;
  owner: {
    login: string;
    avatarUrl: string;
    type: string;
  };
}

export interface AIInsight {
  type: "weakness" | "warning";
  category: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  affectedFiles?: string[];
}

export interface Refactor {
  id: string;
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  effort: "low" | "medium" | "high";
  category: string;
  files: string[];
  suggestedCode?: string;
  codeExample?: string;
}

export interface Automation {
  id: string;
  type: "issue" | "pull-request" | "workflow";
  title: string;
  description: string;
  body: string;
  labels?: string[];
  priority: "low" | "medium" | "high";
}

export interface ArchitectureComponent {
  id: string;
  name: string;
  type:
    | "frontend"
    | "backend"
    | "database"
    | "service"
    | "external"
    | "middleware"
    | "cache"
    | "load-balancer"
    | "queue"
    | "storage"
    | "cdn"
    | "gateway"
    | "worker";
  description: string;
  technologies: string[];
  connections: string[];
  evidence?: string[];
  connectionDetails?: { to: string; label: string }[];
}

export interface DependencyNode {
  id: string;
  label: string;
  group: string;
  description?: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  label?: string;
  type?: "direct" | "indirect";
}

export interface AnalysisResult {
  metadata: RepoMetadata;
  branch?: string;
  availableBranches?: BranchInfo[];
  insights?: AIInsight[];
  refactors?: Refactor[];
  automations?: Automation[];
  architecture?: ArchitectureComponent[];
  dependencyGraph?: {
    nodes: DependencyNode[];
    edges: DependencyEdge[];
  };
}

export type AnalysisStage = "idle" | "fetching" | "parsing" | "analyzing" | "complete" | "error";

export interface StreamingAnalysis {
  stage: AnalysisStage;
  progress: number;
  currentStep: string;
  error?: string;
}

export type IconProps = React.SVGProps<SVGSVGElement> & {
  secondaryfill?: string;
  strokewidth?: number;
  title?: string;
  className?: string;
  fill?: string;
};
