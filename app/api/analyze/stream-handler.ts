import { BranchInfo, RepoMetadata } from "@/lib/types";
import { StreamEvent } from "./types";
import { AnalysisResponseError, parseAnalysisContent } from "@/lib/validators";

export function formatModelError(error: unknown): string {
  if (error instanceof AnalysisResponseError) return error.message;
  const message = error instanceof Error ? error.message : String(error);
  if (/no longer available|no provider|no endpoints found|model.*not found|not a valid model/i.test(message)) {
    return "The AI model is currently unavailable. Please try again later; the site maintainer may need to update the model.";
  }
  return "The AI model could not complete the analysis. Please try again.";
}

const encoder = new TextEncoder();

export function encodeStreamEvent(event: StreamEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export function getStreamHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
    "X-Content-Type-Options": "nosniff",
  };
}

export function createAnalysisStream(
  metadata: RepoMetadata,
  branch: string,
  availableBranches: BranchInfo[],
  textStream: AsyncIterable<string>,
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      controller.enqueue(encodeStreamEvent({
        type: "metadata",
        data: { metadata, branch, availableBranches },
      }));

      let content = "";
      try {
        for await (const chunk of textStream) {
          content += chunk;
          controller.enqueue(encodeStreamEvent({ type: "content", data: chunk }));
        }
        parseAnalysisContent(content);
      } catch (error) {
        const message = formatModelError(error);
        console.error("Model analysis error:", message);
        controller.enqueue(encodeStreamEvent({ type: "error", data: message }));
        controller.close();
        return;
      }

      controller.enqueue(encodeStreamEvent({ type: "done" }));
      controller.close();
    },
  });
}
