import { RepoMetadata, FileStats, BranchInfo } from "@/lib/types";

export interface EnvConfig {
  OPENROUTER_API_KEY: string;
  GITHUB_TOKEN: string | undefined;
}

export interface StreamEventMetadata {
  type: "metadata";
  data: {
    metadata: RepoMetadata;
    branch: string;
    availableBranches: BranchInfo[];
  };
}

export interface StreamEventContent {
  type: "content";
  data: string;
}

export interface StreamEventError {
  type: "error";
  data: string;
}

export interface StreamEventDone {
  type: "done";
}

export type StreamEvent =
  | StreamEventMetadata
  | StreamEventContent
  | StreamEventError
  | StreamEventDone;

export interface AnalyzeRequestBody {
  url: string;
  branch?: string;
}

export interface HealthCheckResponse {
  status: "ok" | "misconfigured";
  timestamp: string;
  services: {
    openrouter: "configured" | "missing";
    github: "configured" | "optional";
  };
}

export interface ErrorResponse {
  error: string;
}

export interface PromptContext {
  metadata: RepoMetadata;
  fileStats: FileStats;
  compactTree: string;
  filesContent: string;
  branch: string;
}
