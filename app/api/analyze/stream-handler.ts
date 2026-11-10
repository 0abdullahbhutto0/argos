import { BranchInfo, RepoMetadata } from "@/lib/types";
import { StreamEvent } from "./types";
import { AnalysisResponseError} from "@/lib/validators";

export function formatModelError(error: unknown): string {
  if (error instanceof AnalysisResponseError) return error.message;
  const message = error instanceof Error ? error.message : String(error);
  return message;
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
      } catch (error) {
        console.error("Model analysis error:", error);
        controller.enqueue(encodeStreamEvent({ type: "error", data: "stream interrupted" }));
        controller.close();
        return;
      }

      controller.enqueue(encodeStreamEvent({ type: "done" }));
      controller.close();
    },
  });
}
