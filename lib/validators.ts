import { z } from "zod";

const githubUrlPattern =
  /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?.*$/;

const shorthandPattern = /^[\w.-]+\/[\w.-]+$/;

function isValidGitHubInput(input: string): boolean {
  const trimmed = input.trim();
  return githubUrlPattern.test(trimmed) || shorthandPattern.test(trimmed);
}

function normalizeToGitHubUrl(input: string): string {
  const trimmed = input.trim();

  if (githubUrlPattern.test(trimmed)) {
    const parsed = new URL(trimmed);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      return `https://github.com/${pathParts[0]}/${pathParts[1]}`;
    }
    return trimmed.replace(/\/$/, "");
  }

  if (shorthandPattern.test(trimmed)) {
    const [owner, repo] = trimmed.split("/");
    return `https://github.com/${owner}/${repo.replace(/\.git$/, "")}`;
  }

  return trimmed;
}

export class AnalysisResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisResponseError";
  }
}

const analysisOutputSchema = z.object({
  architecture: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(["frontend", "backend", "database", "service", "external", "middleware"]),
    description: z.string(),
    technologies: z.array(z.string()).default([]),
    connections: z.array(z.string()).default([]),
  })),
  dependencyGraph: z.object({
    nodes: z.array(z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      group: z.string(),
      description: z.string().optional(),
    })),
    edges: z.array(z.object({
      from: z.string().min(1),
      to: z.string().min(1),
      label: z.string().optional(),
      type: z.enum(["direct", "indirect"]).optional(),
    })),
  }),
});

export function parseAnalysisContent(content: string) {
  if (!content.trim()) {
    throw new AnalysisResponseError("The AI service finished without returning an analysis. Please try again.");
  }

  const match = content.match(/\{[\s\S]*\}/);
  let data: unknown;
  try {
    if (!match) throw new Error("Missing JSON");
    data = JSON.parse(match[0]);
  } catch {
    throw new AnalysisResponseError("The AI service returned an incomplete or unreadable analysis. Please try again.");
  }

  const result = analysisOutputSchema.safeParse(data);
  if (!result.success) {
    throw new AnalysisResponseError("The AI service returned an analysis with missing or invalid fields. Please try again.");
  }
  return result.data;
}

export const githubUrlSchema = z
  .string()
  .min(1, "GitHub URL or owner/repo is required")
  .refine(isValidGitHubInput, {
    message:
      "Please enter a valid GitHub URL or owner/repo (e.g., ig-imanish/mx-icons)",
  })
  .transform(normalizeToGitHubUrl);

export function parseGitHubUrl(
  input: string
): { owner: string; repo: string } | null {
  const trimmed = input.trim();

  if (shorthandPattern.test(trimmed)) {
    const [owner, repo] = trimmed.split("/");
    return {
      owner,
      repo: repo.replace(/\.git$/, ""),
    };
  }

  try {
    const parsed = new URL(trimmed);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      return {
        owner: pathParts[0],
        repo: pathParts[1].replace(/\.git$/, ""),
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function validateGitHubUrl(input: string): {
  valid: boolean;
  error?: string;
  parsed?: { owner: string; repo: string };
  normalizedUrl?: string;
} {
  const result = githubUrlSchema.safeParse(input);

  if (!result.success) {
    return {
      valid: false,
      error: result.error.issues[0]?.message || "Invalid input",
    };
  }

  const parsed = parseGitHubUrl(input);

  if (!parsed) {
    return {
      valid: false,
      error: "Could not parse repository owner and name",
    };
  }

  return {
    valid: true,
    parsed,
    normalizedUrl: result.data,
  };
}
