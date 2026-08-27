## Context Enrichment

A string like `Name` or `Post` means something different depending on where it appears in your app. Context removes the guesswork for translators and AI translations, and the `context` commands let you manage it at scale, straight from the terminal:

1. [`context download`](/commands/crowdin-context-download) - export strings to a local JSONL file
2. **Enrich** - an AI agent analyzes your codebase and fills in a short description for each string
3. [`context upload`](/commands/crowdin-context-upload) - push the enriched context back to Crowdin

The enrichment step is where AI agents shine: your agent already knows your codebase, so it can describe exactly where and how each string is used. Install the [Crowdin Skills](https://github.com/crowdin/skills) and ask your agent to enrich the context - it will run the whole workflow for you.

AI-generated context is stored separately from manual context and never overwrites what a human wrote. Use [`context status`](/commands/crowdin-context-status) to check coverage and [`context reset`](/commands/crowdin-context-reset) to remove AI-generated context while keeping the manual one.

## Links

- [Context Enrichment with AI Agents](/blog/2026/02/23/context-enrichment) - a step-by-step tutorial
- [How to generate and pass AI context for translations via CLI](https://crowdin.com/blog/automate-i18n-context-with-ai-agents) - on the Crowdin Blog
- [Share feedback on the context commands](https://github.com/crowdin/crowdin-cli/discussions/992)
