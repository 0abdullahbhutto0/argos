import { PromptContext } from "./types";
import { CodeMetrics } from "./code-analyzer";
import { isInfrastructureFile } from "@/lib/github";

export function buildPrompt(
  context: PromptContext,
  metrics: CodeMetrics,
): string {
  const { metadata, compactTree, filesContent, branch } = context;
  const metricsContext = formatMetricsContext(metrics);
  const detectedPatterns = formatDetectedPatterns(metrics);

  return `You are a senior software architect analyzing a repository's architecture, dependencies, and actionable issues. Analyze the actual source code supplied below and reference specific files for every claim.

# Repository: ${metadata.fullName}
## Branch: ${branch}
## Description: ${metadata.description || "No description"}
## Primary Language: ${metadata.language || "Not specified"}

## Code Metrics
${metricsContext}

## Detected Patterns & Entry Points
${detectedPatterns}

## Directory Context
\`\`\`
${compactTree}
\`\`\`

## Source File Contents
${filesContent}

# ANALYSIS INSTRUCTIONS

### Architecture & Component Interactions
- Map the major components and subsystems implemented or explicitly configured in the provided source files.
- Specify each component's type, technologies, and connections to other component IDs. Include evidence paths naming the supplied Source File Contents that demonstrate its implementation or deployment.
- Include caches, load balancers, queues, object/file storage, CDNs, gateways, and workers only when actual code or deployment configuration proves they are used. A package dependency, framework default, README claim, or proposed design alone is not proof.
- Do not add generic browser/user nodes, infrastructure placeholders, assumed replicas, or connection arrows to make a conventional system-design template. Omit anything not evidenced in the supplied files.
- Identify actual in-memory caching as an in-memory cache; do not call it Redis or a distributed cache unless the code proves that technology is used.
- Explain interactions through their observed interfaces, protocols, and dependencies. Connections are directed from the calling/using component to the component it actually calls/uses.
- Every architecture connection must reference an existing component ID. Optional connectionDetails entries must reference IDs in that component's connections array, and labels must describe an observed protocol or usage such as HTTP, SQL, cache lookup, or enqueue; omit labels when not known.

### Actionable Issues
- Identify weaknesses and warnings that can become concrete GitHub issues.
- Explain the impact and reference affected files from the provided source.
- Do not generate strengths, general suggestions, quality scores, summaries, setup guides, feature explanations, concept explanations, folder descriptions, data-flow diagrams, or Mermaid code.
- Report only supported findings; do not invent issues to meet a quota.

### Dependency Graph
- Map important file-level and module-level dependencies as a directed graph.
- Choose the 10-20 most important files, modules, or components supported by the provided code.
- Node groups: component, page, api, hook, lib, config, context, store, service, model, middleware.
- Each edge represents an actual import, usage, or dependency relationship. Use direct for explicit imports and indirect for implicit dependencies.
- Every connection must reference an ID present in the corresponding graph.

## RESPONSE FORMAT
Return ONLY valid JSON with these three top-level fields, without markdown wrapping or code fences:

{
  "insights": [
    {
      "type": "warning",
      "category": "Security",
      "title": "Specific actionable issue",
      "description": "Explain the defect and its concrete impact with references to the affected implementation.",
      "priority": "high",
      "affectedFiles": ["src/server/index.ts"]
    }
  ],
  "architecture": [
    {
      "id": "arch-1",
      "name": "Component Name",
      "type": "backend",
      "description": "What this component does and how it interacts with the rest of the system",
      "technologies": ["TypeScript"],
      "connections": [],
      "evidence": ["src/server/index.ts"],
      "connectionDetails": []
    }
  ],
  "dependencyGraph": {
    "nodes": [
      { "id": "dep-1", "label": "api/route.ts", "group": "api", "description": "Handles API requests" },
      { "id": "dep-2", "label": "repository-service", "group": "service", "description": "Provides repository operations" }
    ],
    "edges": [
      { "from": "dep-1", "to": "dep-2", "label": "imports", "type": "direct" }
    ]
  }
}

## REQUIREMENTS
- Insight type must be weakness or warning; priority must be low, medium, high, or critical.
- Architecture type must be frontend, backend, database, service, external, middleware, cache, load-balancer, queue, storage, cdn, gateway, or worker.
- Architecture evidence paths must be present in the supplied Source File Contents; directory names and package manifests alone do not establish deployed infrastructure or runtime connections.
- Do not claim infrastructure is absent when relevant files were not supplied; simply omit unsupported components.
- Automations and refactors are generated separately; do not include them in the response.
- If the evidence does not support a finding or graph, return an empty array rather than guessing.
- Ground all output in the actual files provided, not generic templates.`;
}

function formatMetricsContext(metrics: CodeMetrics): string {
  const lines = [
    `- Tests: ${metrics.hasTests ? `Yes (${metrics.testFileCount} files)` : "No"}`,
    `- CI: ${metrics.hasCI ? metrics.ciProvider : "No"}`,
    `- TypeScript: ${metrics.hasTypeScript ? (metrics.strictMode ? "Strict" : "Yes") : "No"}`,
    `- Linting: ${metrics.hasLinting ? "Yes" : "No"}`,
    `- Security config: ${metrics.hasSecurityConfig ? "Yes" : "No"}`,
    `- Environment example: ${metrics.hasEnvExample ? "Yes" : "No"}`,
    `- Missing essentials: ${metrics.missingEssentials.join(", ") || "None"}`,
  ];

  if (metrics.exposedSecrets.length > 0) {
    lines.push(`- Potential exposed secrets in: ${metrics.exposedSecrets.join(", ")}`);
  }
  if (metrics.vulnerablePatterns.length > 0) {
    lines.push(`- Deprecated dependencies: ${metrics.vulnerablePatterns.join(", ")}`);
  }
  if (metrics.largeFiles.length > 0) {
    lines.push(`- Large files: ${metrics.largeFiles.slice(0, 5).join(", ")}`);
  }
  if (metrics.existingAutomations.length > 0) {
    lines.push(`- Existing automations: ${metrics.existingAutomations.join(", ")}`);
  }

  return lines.join("\n");
}

function formatDetectedPatterns(metrics: CodeMetrics): string {
  const lines: string[] = [];

  if (metrics.entryPoints.length > 0) {
    lines.push("### Entry Points", ...metrics.entryPoints.map((entry) => `- ${entry}`));
  }
  if (metrics.designPatterns.length > 0) {
    lines.push("### Design Patterns", ...metrics.designPatterns.map((pattern) => `- ${pattern.name}: ${pattern.files.join(", ")}`));
  }
  if (metrics.keyAbstractions.length > 0) {
    lines.push("### Classes, Interfaces & Modules", ...metrics.keyAbstractions.slice(0, 20).map((item) => `- ${item}`));
  }
  if (metrics.moduleConnections.length > 0) {
    lines.push("### Module Connections", ...metrics.moduleConnections.slice(0, 15).map((connection) => `- ${connection}`));
  }

  return lines.join("\n") || "No additional patterns detected.";
}

export function prepareFilesContent(
  importantFiles: Record<string, string>,
  maxFiles: number = 15,
  maxContentLength: number = 5000,
): string {
  const entries = Object.entries(importantFiles);
  const infrastructure = new Set(entries
    .filter(([path]) => isInfrastructureFile(path))
    .sort(([a], [b]) => Number(isSourceFile(a)) - Number(isSourceFile(b)))
    .slice(0, Math.min(4, Math.floor(maxFiles / 3)))
    .map(([path]) => path));
  const sorted = entries.sort(([a], [b]) => {
    if (infrastructure.has(a) !== infrastructure.has(b)) return infrastructure.has(a) ? -1 : 1;
    const aIsSource = isSourceFile(a);
    const bIsSource = isSourceFile(b);
    const aIsConfig = isConfigFile(a);
    const bIsConfig = isConfigFile(b);

    if (aIsSource && !bIsSource) return -1;
    if (!aIsSource && bIsSource) return 1;
    if (aIsConfig && !bIsConfig) return -1;
    if (!aIsConfig && bIsConfig) return 1;
    return 0;
  });

  return sorted
    .slice(0, maxFiles)
    .map(([file, content]) => `### ${file}\n\`\`\`\n${content.slice(0, maxContentLength)}\n\`\`\``)
    .join("\n\n");
}

function isSourceFile(path: string): boolean {
  return /\.(ts|tsx|js|jsx|py|go|rs|cpp|c|h|hpp|java|rb|swift|kt)$/.test(path) && !isConfigFile(path);
}

function isConfigFile(path: string): boolean {
  return /\.(json|yaml|yml|toml|config\.|rc$|\.lock$)/.test(path) || /^(package\.json|tsconfig|eslint|prettier|babel|webpack|vite|next\.config)/i.test(path);
}
