import { streamText } from "ai";
import {
  fetchRepoMetadata,
  fetchRepoTree,
  fetchImportantFiles,
  fetchRepoBranches,
  calculateFileStats,
  createCompactTreeString,
} from "@/lib/github";
import {
  getOpenRouterClient,
  isConfigured,
  hasGitHubToken,
  MODEL_ID,
} from "./config";
import { parseRequestBody, validateAndParseUrl } from "./validators";
import { buildPrompt, prepareFilesContent } from "./prompt-builder";
import {
  createAnalysisStream,
  formatModelError,
  getStreamHeaders,
} from "./stream-handler";
import { HealthCheckResponse, ErrorResponse } from "./types";
import {
  recordAnalysisRequest,
  cleanupOldRequests,
} from "@/lib/analysis-log";
import { auth } from "@/lib/auth";

const MAX_BODY_SIZE = 10 * 1024;

export async function POST(request: Request) {
  if (!isConfigured()) {
    return Response.json(
      { error: "Server is not properly configured." } satisfies ErrorResponse,
      { status: 503 },
    );
  }

  try {
    // Resolve the caller so analyses can be attributed in usage statistics
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
      return Response.json(
        { error: "Request body too large" } satisfies ErrorResponse,
        { status: 413 },
      );
    }

    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_SIZE) {
      return Response.json(
        { error: "Request body too large" } satisfies ErrorResponse,
        { status: 413 },
      );
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return Response.json(
        { error: "Invalid JSON in request body" } satisfies ErrorResponse,
        { status: 400 },
      );
    }

    const parsedBody = parseRequestBody(body);
    const { owner, repo } = validateAndParseUrl(parsedBody.url);

    const metadata = await fetchRepoMetadata(owner, repo);
    const targetBranch = parsedBody.branch || metadata.defaultBranch;

    const openrouter = getOpenRouterClient();
    const model = openrouter.chat(MODEL_ID);

    // Parallel fetch
    const [tree, branches] = await Promise.all([
      fetchRepoTree(owner, repo, targetBranch),
      fetchRepoBranches(owner, repo, metadata.defaultBranch),
    ]);

    // Fetch important files with tree context for smart discovery
    const importantFiles = await fetchImportantFiles(owner, repo, targetBranch, tree);

    const fileStats = calculateFileStats(tree);
    const compactTree = createCompactTreeString(tree, 80); // Increased for deeper structure visibility
    const filesContent = prepareFilesContent(importantFiles, 15, 5000); // More files, more content per file

    const prompt = buildPrompt({
      metadata, fileStats, compactTree, filesContent, branch: targetBranch,
    });

    const result = await streamText({
      model,
      prompt,
      temperature: 0.3, // Lower for more precise, grounded analysis
      maxOutputTokens: 800000, // Increased significantly for deep analysis
    });

    const textStream = (async function* () {
      for await (const part of result.fullStream) {
        if (part.type === "error") throw part.error;
        if (part.type === "text-delta") yield part.text;
      }
    })();

    const stream = createAnalysisStream(metadata, targetBranch, branches, textStream);

    // Record the analysis for usage statistics (fire-and-forget)
    const repoUrl = `https://github.com/${owner}/${repo}`;
    recordAnalysisRequest(repoUrl, userId).catch((err) =>
      console.error("Failed to record analysis request:", err),
    );

    // Periodically cleanup old records (~1% of requests)
    if (Math.random() < 0.01) {
      cleanupOldRequests().catch((err) => console.error("Failed to cleanup old requests:", err));
    }
    

    return new Response(stream, { headers: getStreamHeaders() });
  } catch (error) {
    console.error("Analysis error:", error);
    const isOperational =
      error instanceof Error &&
      (error.message.includes("not found") ||
        error.message.includes("rate limit") ||
        error.message.includes("Invalid"));

    const message =
      isOperational && error instanceof Error
        ? error.message
        : error instanceof Error && /model|provider/i.test(error.message)
          ? formatModelError(error)
          : "Analysis failed. Please try again.";

    return Response.json({ error: message } satisfies ErrorResponse, {
      status: 500,
    });
  }
}

export async function GET() {
  const response: HealthCheckResponse = {
    status: isConfigured() ? "ok" : "misconfigured",
    timestamp: new Date().toISOString(),
    services: {
      openrouter: isConfigured() ? "configured" : "missing",
      github: hasGitHubToken() ? "configured" : "optional",
    },
  };
  return Response.json(response);
}
