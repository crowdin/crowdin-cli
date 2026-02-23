---
title: "Context Enrichment with AI Agents"
description: "Learn how to enrich your project's context with AI Agents using Crowdin CLI."
authors: andrii-bodnar
tags: [tutorial]
---

Context is one of the most powerful ways to improve [translation accuracy](https://crowdin.com/blog/translation-accuracy). Without it, translators are left to guess the meaning of short strings, UI labels, and ambiguous phrases - leading to inaccurate translations, longer review cycles, and frustrated localization teams.

The new Crowdin CLI [context management](/commands/crowdin-context) commands make it easy to manage string context at scale, directly from your terminal.

In this post, we'll walk through a practical workflow: download your strings, enrich them using an AI agent with the help of [Crowdin Skills](https://github.com/crowdin/skills), and push the result back to Crowdin.

<!--truncate-->

## The Workflow

A string like `Name` or `Post` means something very different depending on where it appears in your app. Is it username or post title? Is it a label or a button? Without context, translators must guess - and guesses lead to mistakes.

The context enrichment workflow with Crowdin CLI is straightforward:

1. **Download** strings context to a local file
2. **Enrich** the context using an AI agent
3. **Upload** the enriched context back to Crowdin

Let's walk through each step.

## Step 0: Install Crowdin Skills

[Crowdin Skills](https://github.com/crowdin/skills) is a collection of agent skills that teach your AI agent how to work with Crowdin - including how to correctly fill string context.

Install all Crowdin skills with a single command:

```bash
npx skills add crowdin/skills
```

This installs two skills relevant to context enrichment:

- `crowdin-context-cli` - documents the `context download` and `context upload` CLI commands so the agent understands the full workflow and the JSONL format.
- `context-extraction` - teaches the agent how to write good context descriptions: which strings need context (ambiguous short words, plurals, UI labels with inline formatting), how to write concise 1–3 sentence descriptions that explain the UI element type and placement, and what *not* to touch in the file.

## Step 1: Download Strings Context

The [`context download`](/commands/crowdin-context-download) command exports your project's strings to a local `.jsonl` file, ready for AI enrichment.

```bash
crowdin context download
```

By default, this creates a `crowdin-context.jsonl` file in the current directory. You can also customize the output path with the `--to` option. You don't need to execute this command manually. There is no need to execute this command manually. The agent can do it for you when you ask it to.

:::info
JSONL is a line-delimited format that is easy to parse and write. It is a good format for AI agents to work with. There are many IDE extensions available, such as [JSONL Gazelle](https://marketplace.visualstudio.com/items?itemName=gabor.jsonl-gazelle) for VS Code. It allows you to view the JSONL file content in a more readable format.
:::

#### Filtering Strings

You rarely need to enrich all strings at once. The command supports a range of filters so you can focus on exactly what matters:

| Filter             | Description                                        | Example Command                                      |
|--------------------|----------------------------------------------------|------------------------------------------------------|
| By file            | Process strings from specific source files         | `crowdin context download -f "src/ui/**"`            |
| By label           | Target strings with specific labels                | `crowdin context download --label needs-context`     |
| By context status  | Only download strings that are missing context     | `crowdin context download --status empty`            |
| By date            | Only strings created after a specific date         | `crowdin context download --since 2026-01-01`        |
| By branch          | Only strings from a specific branch                | `crowdin context download -b main`                   |

These filters are especially useful when running context enrichment as part of a CI/CD pipeline or when incrementally updating context for new strings.

## Step 2: Enrich Context with AI Agents

Your AI agent already knows your codebase, so it can write the best description possible for your strings. Once you have your `crowdin-context.jsonl` file, it's time to let the agent do the heavy lifting.

:::tip
Just **ask your agent** to enrich the context. It will use the Crowdin CLI to download and upload context, and the `context-extraction` skill to write good descriptions.
:::

## Step 3: Upload Enriched Context

Once your AI agent has enriched the `crowdin-context.jsonl` file, upload it back to Crowdin with the [`context upload`](/commands/crowdin-context-upload) command:

```bash
crowdin context upload
```

Use the `--from` option if you used a custom path with `--to` during download.

## Additional Commands

### Check Context Coverage

The [`context status`](/commands/crowdin-context-status) command gives you a quick overview of how much of your project has context filled in:

```bash
crowdin context status
✔️  Fetching project info    
Context Status for Project "Demo" (ID: 00000)

Total strings:       3484
With AI context:     50 (1.44%)
Without AI context:  3434 (98.56%)
With manual context: 3484 (100.00%)
```

Use `--by-file` to see a breakdown per source file - useful for spotting which files need the most attention.

### Reset AI-Generated Context

The [`context reset`](/commands/crowdin-context-reset) command removes AI-generated context from strings while preserving any manually written context:

```bash
crowdin context reset --all
```

You can scope the reset to specific files, labels, or branches using the same filtering options available on the other commands. The `--all` flag is required when no filter is specified, as a safety measure against accidental bulk resets.

## Summary

This post showed how to enrich your project's string context using Crowdin CLI and an AI agent. The workflow: install [Crowdin Skills](https://github.com/crowdin/skills), download strings to a local JSONL file, ask your agent to fill in context, then upload the result back to Crowdin. Use context status to check coverage and context reset to remove AI-generated context when needed.
