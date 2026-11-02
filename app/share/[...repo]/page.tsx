import { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharePageClient } from "../../../components/share-page-client";

interface SharePageProps {
  params: Promise<{
    repo: string[];
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
        next: { revalidate: 3600 },
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
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { repo } = await params;

  if (!repo || repo.length < 2) {
    return {
      title: "Not Found | Argos",
      description: "Repository not found on Argos.",
    };
  }

  const owner = repo[0];
  const repoName = repo[1];
  const repoFullName = `${owner}/${repoName}`;

  const github = await getGitHubData(owner, repoName);

  const title = `${repoFullName} - Repository Analysis | Argos`;

  const description =
    github?.description && github.description.length >= 100
      ? github.description
      : `Code analysis for ${repoFullName}. Get insights on code quality, architecture, security vulnerabilities, and actionable improvement suggestions on Argos.`;

  return { title, description };
}

export default async function SharePage({ params }: SharePageProps) {
  const { repo } = await params;

  if (!repo || repo.length < 2) {
    notFound();
  }

  return <SharePageClient repoFullName={repo.join("/")} />;
}
