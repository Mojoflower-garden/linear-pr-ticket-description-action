import { exec } from 'child_process';

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

function findMatchingStrings(strings: string[], regex: RegExp): string[] {
  const matchingStrings = strings
    .flatMap((str) => {
      const matches = str.match(regex);
      return matches ? matches : [];
    })
    .map((match) => match.toUpperCase());
  return Array.from(new Set(matchingStrings));
}

async function listCommits(prNumber: number) {
  try {
    const result = await runGHCommand(
      `gh pr view ${prNumber} --json commits` // Note there is probably some limit to how many commits this returns. But I don't know where that is documented.
    );
    const data: CommitsResponse = JSON.parse(result);
    return data.commits.map((c) => c.messageHeadline);
  } catch (error) {
    console.error('Error:', error);
  }
}

function generatePRDescription(
  strings: string[],
  matchRegex: RegExp,
  magicWord?: string
): string | undefined {
  const matches = findMatchingStrings(strings, matchRegex);

  if (matches.length === 0) {
    console.log('No ticket found in any commits for this pr');
    return;
  }

  // Join matches with comma and space
  const description = `${magicWord ? magicWord + ' ' : ''}${matches.join(
    ', '
  )}`;
  return description;
}
// TEST
function updatePRDescription(
  currentDescription: string,
  newSection: string
): string {
  const regex =
    /<!-- === TICKETS FENCE START === -->[\s\S]*?<!-- === TICKETS FENCE END === -->/gi;
  const cleanedDescription = currentDescription.replace(regex, '');
  // Concatenate cleaned description with new section
  const updatedDescription =
    cleanedDescription.trim() + '\n\n' + newSection.trim();

  return updatedDescription.trim();
}

export { updatePRDescription, generatePRDescription, listCommits };
