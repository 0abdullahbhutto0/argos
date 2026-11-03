import { NextRequest } from "next/server";
import { fetchRepoMetadata, fetchRepoBranches } from "@/lib/github";
import { validateAndParseUrl } from "../analyze/validators";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return Response.json({ error: "URL is required" }, { status: 400 });
    }

    const { owner, repo } = validateAndParseUrl(url);

    const metadata = await fetchRepoMetadata(owner, repo);
    const branches = await fetchRepoBranches(
      owner,
      repo,
      metadata.defaultBranch
    );

    return Response.json(
      {
        branches,
        defaultBranch: metadata.defaultBranch,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching branches:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch branches",
      },
      { status: 400 }
    );
  }
}
