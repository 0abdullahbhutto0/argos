import { streamText } from "ai";
import {
  fetchRepoMetadata,
  fetchRepoTree,
  fetchImportantFiles,
  fetchRepoBranches,
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
  createCachedAnalysisStream,
} from "./stream-handler";
import { analyzeCodeMetrics } from "./code-analyzer";
import { generateAutomations } from "./automation-generator";
import { generateRefactors } from "./refactor-generator";
import { HealthCheckResponse, ErrorResponse } from "./types";
import {
  recordAnalysisRequest,
  cleanupOldRequests,
} from "@/lib/analysis-log";
import { auth } from "@/lib/auth";
import { analysisResultCache } from "@/lib/server-cache";

const MAX_BODY_SIZE = 10 * 1024;

// In-flight request deduplication: if repo X is already being analyzed,
// subsequent requests wait for the first to finish and then get the cached result.
const inFlightRequests = new Map<string, Promise<void>>();

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

    // ─── Check analysis result cache (serves repeat requests instantly) ───
    const metadata = await fetchRepoMetadata(owner, repo);
    const targetBranch = parsedBody.branch || metadata.defaultBranch;
    const analysisCacheKey = `${owner}/${repo}:${targetBranch}`;

    const cachedResult = analysisResultCache.get(analysisCacheKey);
    if (cachedResult) {
      // Serve cached result as a stream (instant, no AI call)
      const cachedStream = createCachedAnalysisStream(cachedResult);
      return new Response(cachedStream);
    }

    // ─── In-flight deduplication: wait if same repo is already being analyzed ───
    const inFlight = inFlightRequests.get(analysisCacheKey);
    if (inFlight) {
      try {
        await inFlight;
        // Now the result should be cached
        const afterWait = analysisResultCache.get(analysisCacheKey);
        if (afterWait) {
          const cachedStream = createCachedAnalysisStream(afterWait);
          return new Response(cachedStream);
        }
      } catch {
        // First request failed, proceed with our own analysis
      }
    }

    const openrouter = getOpenRouterClient();
    const model = openrouter.chat(MODEL_ID);

    // Parallel fetch (all cached individually too)
    const [tree, branches] = await Promise.all([
      fetchRepoTree(owner, repo, targetBranch),
      fetchRepoBranches(owner, repo, metadata.defaultBranch),
    ]);

    // Fetch important files with tree context for smart discovery
    const importantFiles = await fetchImportantFiles(owner, repo, targetBranch, tree);

    // Fast metrics computation
    const codeMetrics = analyzeCodeMetrics(tree, importantFiles);

    // Generate only essential suggestions (no PR generation)
    const generatedAutomations = generateAutomations(
      codeMetrics,
      metadata.name,
      metadata.language,
    );
    const generatedRefactors = generateRefactors(
      codeMetrics,
      metadata.name,
      metadata.language,
    );

    const compactTree = createCompactTreeString(tree, 80);
    const filesContent = prepareFilesContent(importantFiles, 15, 5000);

    const prompt = buildPrompt(
      { metadata, compactTree, filesContent, branch: targetBranch },
      codeMetrics,
    );

    const result = await streamText({
      model,
      prompt,
      temperature: 0.3, // Lower for more precise, grounded analysis
      maxOutputTokens: 80000, // Increased significantly for deep analysis
    });

    // Collect AI content for caching while streaming
    const aiContentChunks: string[] = [];
    let resolveInFlight: () => void;
    let rejectInFlight: (err: Error) => void;
    const inFlightPromise = new Promise<void>((resolve, reject) => {
      resolveInFlight = resolve;
      rejectInFlight = reject;
    });
    inFlightRequests.set(analysisCacheKey, inFlightPromise);

    const cachingTextStream = (async function* () {
      try {
        for await (const chunk of result.textStream) {
          aiContentChunks.push(chunk);
          yield chunk;
        }
      } catch (err) {
        rejectInFlight!(err instanceof Error ? err : new Error(String(err)));
        inFlightRequests.delete(analysisCacheKey);
        throw err;
      }
    })();

    const stream = createAnalysisStream(
      metadata,
      targetBranch,
      branches,
      cachingTextStream,
      {
        automations: generatedAutomations,
        refactors: generatedRefactors,
      },
      // onComplete: cache the full result and resolve in-flight
      () => {
        analysisResultCache.set(analysisCacheKey, {
          metadata,
          branch: targetBranch,
          availableBranches: branches,
          automations: generatedAutomations,
          refactors: generatedRefactors,
          aiContent: aiContentChunks.join(""),
        });
        resolveInFlight!();
        inFlightRequests.delete(analysisCacheKey);
      },
    );

    // Record the analysis for usage statistics (fire-and-forget)
    const repoUrl = `https://github.com/${owner}/${repo}`;
    recordAnalysisRequest(repoUrl, userId).catch((err) =>
      console.error("Failed to record analysis request:", err),
    );

    // Periodically cleanup old records (~1% of requests)
    if (Math.random() < 0.01) {
      cleanupOldRequests().catch((err) => console.error("Failed to cleanup old requests:", err));
    }
    

    return new Response(stream);
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
