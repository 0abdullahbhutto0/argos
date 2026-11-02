import { prisma } from "@/lib/prisma";

/**
 * Record a completed analysis for usage statistics.
 * Analyses are not limited — this is write-only bookkeeping.
 */
export async function recordAnalysisRequest(
  repoUrl: string,
  userId: string | null,
): Promise<void> {
  await prisma.analysisRequest.create({
    data: { repoUrl, userId },
  });
}

/**
 * Cleanup old records (older than 2 days) to keep the table small.
 * Called on a small percentage of requests.
 */
export async function cleanupOldRequests(): Promise<void> {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  await prisma.analysisRequest.deleteMany({
    where: { createdAt: { lt: twoDaysAgo } },
  });
}
