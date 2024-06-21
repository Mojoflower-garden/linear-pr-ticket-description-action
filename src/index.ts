import { getInput, setFailed } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import {
  generatePRDescription,
  listCommits,
  updatePRDescription,
} from './helpers';

export async function run() {
  const token = getInput('gh-token');
  const ticketRegex = getInput('ticket-regex');
  const octokit = getOctokit(token);
  const pr = context.payload.pull_request;

  console.log('REGEX:', ticketRegex);

  try {
    if (!pr) {
      throw new Error('This action can only be run on Pull Requests');
    }

    try {
      const commitHeadlines = await listCommits(pr.number);

      const regexPattern = ticketRegex; // Example regex pattern, adjust as needed
      const regex = new RegExp(regexPattern, 'gi');

      const prDescription = generatePRDescription(commitHeadlines ?? [], regex);

      const fencedSection = `
<!-- === LINEAR TICKETS FENCE START === -->\n

## Linear Tickets Found\n\n
${prDescription}\n

<!-- === LINEAR TICKETS FENCE END === -->
        `;

      await octokit.rest.issues.update({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: updatePRDescription(pr.body ?? '', fencedSection),
      });
    } catch (error: any) {
      console.error('Error fetching commit messages:', error?.message);
      throw error;
    }
  } catch (error) {
    setFailed((error as Error)?.message ?? 'Unknown error');
  }
}

run();
