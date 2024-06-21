import { getInput, setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { exec } from "child_process";

interface Author {
  email: string;
  id: string;
  login: string;
  name: string;
}

interface Commit {
  authoredDate: string;
  authors: Author[];
  committedDate: string;
  messageBody: string;
  messageHeadline: string;
  oid: string;
}

interface CommitsResponse {
  commits: Commit[];
}

// Function to run a GitHub CLI command
function runGHCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`error: ${stderr}`);
        return;
      }
      resolve(stdout);
    });
  });
}

async function listCommits(prNumber: number) {
  try {
    const result = await runGHCommand(
      `gh pr view ${prNumber} --json commits` // Note there is probably some limit to how many commits this returns. But I don't know where that is documented.
    );
    const data: CommitsResponse = JSON.parse(result);
    return data.commits.map((c) => c.messageHeadline);
  } catch (error) {
    console.error("Error:", error);
  }
}

function findMatchingStrings(strings: string[]): string[] {
  const regex = /mojo-\d+/gi; // Regular expression to match "MOJO-%number%" (case insensitive)
  // Use flatMap to collect all matches from all strings
  return strings.flatMap((str) => {
    const matches = str.match(regex);
    return matches ? matches : [];
  });
}

function generatePRDescription(strings: string[]): string {
  const matches = findMatchingStrings(strings);

  if (matches.length === 0) {
    return "No MOJO references found in this pull request.";
  }

  // Join matches with comma and space
  const description = `ref ${matches.join(", ")}`;
  return description;
}

function updatePRDescription(
  currentDescription: string,
  newSection: string
): string {
  // Remove the existing "Linear Tickets Found" section
  const regex =
    /## Linear Tickets Found([\s\S]*?)<!-- === LINEAR TICKETS FENCE START === -->[\s\S]*?<!-- === LINEAR TICKETS FENCE END === -->/gi;
  const cleanedDescription = currentDescription.replace(regex, "");

  console.log("CURRENT DESCT:", currentDescription);
  console.log("CLEANED DESCRIPTION:", cleanedDescription);

  // Concatenate cleaned description with new section
  const updatedDescription =
    cleanedDescription.trim() + "\n\n" + newSection.trim();

  return updatedDescription.trim();
}

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
      console.log("FETCHING pulls");

      const commitHeadlines = await listCommits(pr.number);

      console.log("COMMIT HEADLINES:", commitHeadlines);
      const matches = findMatchingStrings(commitHeadlines ?? []);

      if (matches.length > 0) {
        const fencedSection = `
## Linear Tickets Found 2\n\n

<!-- === LINEAR TICKETS FENCE START === -->\n
${generatePRDescription(matches)}\n
<!-- === LINEAR TICKETS FENCE END === -->
`;
        await octokit.rest.issues.update({
          issue_number: context.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          body: updatePRDescription(pr.body ?? "", fencedSection),
        });
      }
      // Fetch the pull request details including commits
      //   const { data: pullRequest } = await octokit.rest.pulls.get({
      //     owner: context.repo.owner,
      //     repo: context.repo.repo,
      //     pull_number: pr.number,
      //   });

      //   const createdAt = pullRequest.created_at;
      //   const baseBranch = pullRequest.head.ref;

      //   console.log("FETCHING COMMITS", baseBranch, createdAt);
      //   // Fetch commits from the base branch after the pull request was created
      //   const { data: commits } = await octokit.rest.repos.listCommits({
      //     owner: context.repo.owner,
      //     repo: context.repo.repo,
      //     sha: baseBranch,
      //     since: createdAt,
      //   });

      //   // Filter commits to include only those part of the pull request
      //   // Note: this assumes all commits on the branch after the PR creation are part of the PR
      //   messages = commits.map((commit) => commit.commit.message);
    } catch (error: any) {
      console.error("Error fetching commit messages:", error?.message);
      throw error;
    }

    // console.log("Commit messages in the pull request:", messages);
  } catch (error) {
    setFailed((error as Error)?.message ?? "Unknown error");
  }
}

run();
