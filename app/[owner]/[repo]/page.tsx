import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

interface AnalyzePageProps {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
}

async function getGitHubData(owner: string, repo: string) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return {
      name: data.name,
      description: data.description || "",
      stars: data.stargazers_count,
      language: data.language || "Unknown",
    };
  } catch (error) {
    console.error("Failed to fetch GitHub data:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: AnalyzePageProps): Promise<Metadata> {
  const { owner, repo } = await params;

  if (!owner || !repo) {
    return {
      title: "Not Found | Argos",
      description: "Repository not found on Argos.",
    };
  }

  const repoFullName = `${owner}/${repo}`;
  const github = await getGitHubData(owner, repo);

  const title = `${repoFullName} - Repository Analysis | Argos`;

  const description =
    github?.description && github.description.length >= 100
      ? github.description
      : `Analyze ${repoFullName} with AI. Explore its architecture and module dependencies on Argos.`;

  return { title, description };
}

export default async function AnalyzePage({ params }: AnalyzePageProps) {
  const { owner, repo } = await params;

  if (!owner || !repo) {
    notFound();
  }

  // Validate that the repository exists
  const github = await getGitHubData(owner, repo);
  
  if (!github) {
    notFound();
  }

  const repoFullName = `${owner}/${repo}`;
  const repoUrl = `https://github.com/${repoFullName}`;

  // Redirect to home page with repo parameter to start analysis
  redirect(`/?repo=${encodeURIComponent(repoUrl)}`);
}
