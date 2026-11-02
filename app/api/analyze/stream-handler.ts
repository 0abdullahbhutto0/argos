import { RepoMetadata, BranchInfo } from "@/lib/types";
import { StreamEvent } from "./types";
import { GeneratedAutomation } from "./automation-generator";
import { GeneratedRefactor } from "./refactor-generator";
import { CachedAnalysisResult } from "@/lib/server-cache";

const encoder = new TextEncoder();

export function encodeStreamEvent(event: StreamEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export function getStreamHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Connection: "keep-alive",
    "X-Content-Type-Options": "nosniff",
  };
}

interface PreComputedData {
  automations: GeneratedAutomation[];
  refactors: GeneratedRefactor[];
}

export function createAnalysisStream(
  metadata: RepoMetadata,
  branch: string,
  availableBranches: BranchInfo[],
  textStream: AsyncIterable<string>,
  preComputed: PreComputedData,
  onComplete?: () => void,
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      controller.enqueue(encodeStreamEvent({
        type: "metadata",
        data: { metadata, branch, availableBranches },
      }));
      controller.enqueue(encodeStreamEvent({ type: "automations", data: preComputed.automations }));
      controller.enqueue(encodeStreamEvent({ type: "refactors", data: preComputed.refactors }));

      try {
        for await (const chunk of textStream) {
          controller.enqueue(encodeStreamEvent({ type: "content", data: chunk }));
        }
      } catch (error) {
        console.error("Stream error:", error);
        controller.enqueue(encodeStreamEvent({ type: "error", data: "Stream interrupted" }));
      }

      controller.enqueue(encodeStreamEvent({ type: "done" }));
      controller.close();
      onComplete?.();
    },
  });
}

export function createCachedAnalysisStream(cached: CachedAnalysisResult): ReadableStream {
  return new ReadableStream({
    start(controller) {
      const send = (event: StreamEvent) => controller.enqueue(encodeStreamEvent(event));

      send({
        type: "metadata",
        data: {
          metadata: cached.metadata,
          branch: cached.branch,
          availableBranches: cached.availableBranches,
        },
      });
      send({ type: "automations", data: cached.automations });
      send({ type: "refactors", data: cached.refactors });

      if (cached.aiContent) {
        send({ type: "content", data: cached.aiContent });
      }

      send({ type: "done" });
      controller.close();
    },
  });
}
