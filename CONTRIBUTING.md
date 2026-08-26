# Contributing

:tada: First off, thanks for taking the time to contribute! :tada:

The following is a set of guidelines for contributing to Crowdin CLI. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

This project and everyone participating in it are governed by the [Code of Conduct](/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How can I contribute?

### Star this repo

It's quick and goes a long way! :stars:

### Reporting Bugs

This section guides you through submitting a bug report for Crowdin CLI. Following these guidelines helps maintainers, and the community understand your report :pencil:, reproduce the behavior :computer:, and find related reports :mag_right:.

When you are creating a bug report, please include as many details as possible. Fill out the required issue template, the information it asks for helps us resolve issues faster.

#### How Do I Submit a Bug Report?

Bugs are tracked as [GitHub issues](https://github.com/crowdin/crowdin-cli/issues/).

Explain the problem and include additional details to help reproduce the problem:

* **Use a clear and descriptive title** for the issue to identify the problem.
* **Describe the exact steps which reproduce the problem** in as many details as possible. Don't just say what you did, but explain how you did it.
* **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
* **Explain which behavior you expected to see instead and why.**

Include details about your configuration and environment:

* Which operating system are you using?
* Are you using some proxies or firewalls in your network?

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for Crowdin CLI, including completely new features and minor improvements to existing functionality. Following these guidelines helps maintainers and the community understand your suggestion :pencil: and find related suggestions :mag_right:.

When you are creating an enhancement suggestion, please include as many details as possible. Fill in feature request, including the steps that you imagine you would take if the feature you're requesting existed.

#### How Do I Submit an Enhancement Suggestion?

Enhancement suggestions are tracked as [GitHub issues](https://github.com/crowdin/crowdin-cli/issues/).

Create an issue on that repository and provide the following information:

* **Use a clear and descriptive title** for the issue to identify the suggestion.
* **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
* **Describe the current behavior** and **explain which behavior you expected to see instead** and why.
* **Explain why this enhancement would be useful** to most CLI users.

### Your First Code Contribution

Unsure where to begin contributing to Crowdin CLI? You can start by looking through these `good-first-issue` and `help-wanted` issues:

* [Good first issue](https://github.com/crowdin/crowdin-cli/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22) - issues which should only require a small amount of code, and a test or two.
* [Help wanted](https://github.com/crowdin/crowdin-cli/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22) - issues which should be a bit more involved than `Good first issue` issues.

#### Pull Request Checklist

Before sending your pull requests, make sure you followed the list below:

- Read this guideline.
- Read [Code of Conduct](/CODE_OF_CONDUCT.md).
- Ensure that your code adheres to standard conventions, as used in the rest of the project.
- Ensure that there are unit tests for your code.
- Run unit tests.

> **Note**
> This project uses the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for commit messages and PR titles.

**Commit examples:**

- chore: update dependencies
- feat: add pagination to files list
- fix: resolve issue with config validation
- docs: add documentation for commands
- refactor: extract component logic into separate module

#### Contributing to the docs

The documentation is based on [Docusaurus](https://docusaurus.io/) framework. Source inside the [website](https://github.com/crowdin/crowdin-cli/tree/main/website) directory.

- Go to the `website` directory:

  ```sh
  cd website
  ```

- Install dependencies:

   ```sh
   npm install
   ```

- To build the docs, watch for changes and preview documentation locally at [http://localhost:3000/](http://localhost:3000/):

   ```sh
   npm start
   ```

The CLI commands documentation is generated directly from the command definitions in `src-next/cli/commands.ts` — the same data the CLI runs on, so the docs can never drift from the actual behavior.

Please be sure to generate the command documentation before launching the site. Run the following script from the repository root to generate it:

```sh
bun run docs
```

It writes one Markdown page per command to `website/docs/commands/`. Hand-authored content (Examples, Notes, etc.) lives in `website/docs-extras/<page>.md` and is appended verbatim to the matching generated page.

##### Adding a new command

To add a new command to the documentation, you need to:

- register the command in `src-next/cli/commands.ts` — the docs page is generated from its definition automatically.
- optionally add extra content (e.g. an `## Examples` section) as `website/docs-extras/crowdin-<command>.md`.
- add the corresponding item(s) to the `website/sidebars.ts`.

#### Philosophy of code contribution

- Include unit tests when you contribute new features, as they help to a) prove that your code works correctly, and b) guard against future breaking changes to lower the maintenance cost.
- Bug fixes also generally require unit tests, because the presence of bugs usually indicates insufficient test coverage.
