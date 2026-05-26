---
name: crowdin-api-client
description: Guides developers using @crowdin/crowdin-api-client with concise, production-ready patterns for setup, pagination, retries, uploads, and error handling. Use when implementing or reviewing Crowdin API client usage in this repository.
---

# Crowdin API Client

Use this skill for short, practical help when writing code with `@crowdin/crowdin-api-client`.

## Default Approach

1. Prefer `Client` for multi-API workflows; destructure only required API modules.
2. Use typed credentials with `token` and optional `organization`.
3. Write `async/await` style with `try/catch`.
4. Reuse existing project conventions and API modules before adding new wrappers.
5. Keep examples runnable with minimal placeholders (`projectId`, `fileId`, `languageId`).

## Scope and Trigger

Apply this skill when the user asks to:

- add or refactor Crowdin API client calls
- implement uploads, translations, screenshots, or project/file operations
- fix pagination/retry/timeout/error handling around Crowdin calls
- review whether API client usage follows repository conventions

Do not apply this skill for unrelated infrastructure-only changes.

## Quick Start Pattern

```ts
import { Client, Credentials } from '@crowdin/crowdin-api-client';

const credentials: Credentials = {
  token: process.env.CROWDIN_TOKEN!,
  organization: process.env.CROWDIN_ORG, // optional
};

const { projectsGroupsApi } = new Client(credentials);
const projects = await projectsGroupsApi.listProjects();
```

## Choosing API Entry Point

- Use `new Client(credentials, options)` when one flow uses multiple modules (for example upload + source files + translations).
- Use specific APIs (`new ProjectsGroups(credentials, options)`) for narrow, single-module tasks.
- Prefer extending existing module usage in nearby code instead of introducing a new style in the same file.

## Recommended Patterns

- **Pagination:** use `.withFetchAll()` for full collections.
- **Browser/worker runtimes:** initialize API with `{ httpClientType: 'fetch' }`.
- **Retries:** pass `retryConfig` for transient failures.
- **Timeouts:** use `{ httpRequestTimeout: 60_000 }` when network behavior must be bounded.
- **Uploads:** create storage first (`uploadStorageApi.addStorage`), then create file (`sourceFilesApi.createFile`).
- **Errors:** detect `CrowdinValidationError` vs `CrowdinError` in `catch`.

## Common Workflows

### Upload and Create File

1. Build upload payload (JSON/buffer/file).
2. Call `uploadStorageApi.addStorage(fileName, data)`.
3. Call `sourceFilesApi.createFile(projectId, { storageId, ... })`.
4. Return created resource ID and essential metadata.

### Build and Download Translation

1. Call `translationsApi.buildProjectFileTranslation(projectId, fileId, { targetLanguageId })`.
2. Read `data.url` from response.
3. Download content with `fetch`.
4. Parse according to format (JSON/text/binary).

### List All Records

1. Start from API instance that supports limit/offset methods.
2. Call `.withFetchAll()` (or `.withFetchAll(maxItems)`).
3. Prefer this over manual pagination loops unless custom batching is required.

## Error Handling Template

```ts
import { CrowdinError, CrowdinValidationError } from '@crowdin/crowdin-api-client';

try {
  // Crowdin API call
} catch (error) {
  if (error instanceof CrowdinValidationError) {
    // input/validation issues, inspect validation codes
    throw error;
  }
  if (error instanceof CrowdinError) {
    // API/network/server issues
    throw error;
  }
  throw error;
}
```

## API Method Accuracy Rule

For endpoint-specific request/response details, use the official client docs first:

- `https://crowdin.github.io/crowdin-api-client-js/modules.html`

Validation order:

1. Find the correct class/module for the endpoint in docs.
2. Confirm method signature and argument types.
3. Match response shape to existing models/interfaces before coding.

## Code Review Checklist

- API module is correct for the task.
- Input types and required fields are present.
- Pagination approach matches data volume.
- Error handling distinguishes validation vs generic errors.
- Runtime options (`fetch`, retry, timeout) match execution environment.
