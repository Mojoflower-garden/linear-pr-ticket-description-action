import { getInput, setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";

export async function run() {
  const token = getInput("gh-token");
  const octokit = getOctokit(token);
  const pr = context.payload.pull_request;

  try {
    if (!pr) {
      throw new Error("This action can only be run on Pull Requests");
    }

    let messages: string[];

    try {
      console.log("FETCHING pulls 123");
      // Fetch the pull request details including commits
      const { data: pullRequest } = await octokit.rest.pulls.get({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: pr.number,
      });

      const createdAt = pullRequest.created_at;
      const baseBranch = pullRequest.base.ref;

      console.log("FETCHING COMMITS", baseBranch, createdAt);
      // Fetch commits from the base branch after the pull request was created
      const { data: commits } = await octokit.rest.repos.listCommits({
        owner: context.repo.owner,
        repo: context.repo.repo,
        sha: baseBranch,
        since: createdAt,
      });

      // Filter commits to include only those part of the pull request
      // Note: this assumes all commits on the branch after the PR creation are part of the PR
      messages = commits.map((commit) => commit.commit.message);
    } catch (error: any) {
      console.error("Error fetching commit messages:", error?.message);
      throw error;
    }

    console.log("Commit messages in the pull request:", messages);
  } catch (error) {
    setFailed((error as Error)?.message ?? "Unknown error");
  }
}

run();
