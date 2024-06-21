# Ticket ids into PR Description

This action finds all ticket ids in commit headlines that are included in a specific PR and adds them to the PR description. It will always put the ticket ids at the end of your PR descriptions.

# Usage

## GitHub Actions

First, visit your repository's Settings -> Actions -> General, and select 'Read and write permissions' in 'Workflow permissions'.

Then add set up a job as below:

```yaml
on:
  pull_request:

jobs:
  ticketDescription:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: ./
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          gh-token: ${{ secrets.GITHUB_TOKEN }}
          ticket-regex: "LINEAR-\\d+"
          section-title: 'Linear Tickets Found'
          magic-word: 'fixes'
```

# Configuration

The format of the ticket ids in your commit headlines that this action will search for can be configured via the variable `ticket-regex` as seen above.

The title of the section in the PR description can be changed via the `section-title` variable as seen above.

You can also input some text in front of the list of ticket-ids found by supplying that text in the `magic-word` variable as seen above.
