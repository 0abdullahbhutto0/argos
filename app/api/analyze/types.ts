import { BranchInfo, RepoMetadata } from "@/lib/types";
import { GeneratedAutomation } from "./automation-generator";
import { GeneratedRefactor } from "./refactor-generator";

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

export interface StreamEventAutomations {
  type: "automations";
  data: GeneratedAutomation[];
}

export interface StreamEventRefactors {
  type: "refactors";
  data: GeneratedRefactor[];
}

export type StreamEvent =
  | StreamEventMetadata
  | StreamEventContent
  | StreamEventError
  | StreamEventDone
  | StreamEventAutomations
  | StreamEventRefactors;

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
  compactTree: string;
  filesContent: string;
  branch: string;
}
