---
name: crowdin-api-client
description: Use when implementing, refactoring, or reviewing `@crowdin/crowdin-api-client` usage in any JavaScript or TypeScript project, especially for endpoint selection, request/response typing, pagination, uploads, retries, timeouts, or `CrowdinError` handling.
---

# Crowdin API Client

## Overview

Use this skill when touching Crowdin API integration code in any project that depends on `@crowdin/crowdin-api-client`.
Core principle: verify local client typings first, then implement with strict model types and correct response envelope handling.

## When to Use

- New or changed calls to `@crowdin/crowdin-api-client`.
- Compile/type errors after API-client upgrades.
- Confusion about method names, request fields, or `ResponseList` vs `ResponseObject`.
- Refactors involving uploads, file translations, screenshots, tasks, comments, strings, or projects.
- Reviews where behavior works at runtime but types/mapping look suspicious.

Do not use this skill for unrelated infra-only changes.

## Required Preflight (Before Editing)

1. Check local declarations first: `node_modules/@crowdin/crowdin-api-client/out/<module>/index.d.ts`.
2. Confirm exact API class and method name in use.
3. Confirm request model type and required fields.
4. Confirm response envelope: `ResponseList<T>` or `ResponseObject<T>`.

Do not code from memory when typings and docs disagree.

## Quick Reference

| Scenario | Preferred Pattern |
|---------|-------------------|
| Multi-module flow | `new Client(credentials, options)` and destructure needed APIs |
| Single narrow flow | Direct module API class is acceptable |
| Full collection reads | `.withFetchAll()` |
| Transient failures | `retryConfig` |
| Bounded request duration | `{ httpRequestTimeout: 60_000 }` |
| Uploads | `uploadStorageApi.addStorage` -> `sourceFilesApi.createFile` |
| Error branching | `CrowdinValidationError` before `CrowdinError` |

## Core Patterns

### Bootstrap

```ts
import { Client, Credentials } from '@crowdin/crowdin-api-client';

const credentials: Credentials = {
  token: process.env.CROWDIN_TOKEN!,
  organization: process.env.CROWDIN_ORG,
};

const client = new Client(credentials);
```

### Response Envelope Handling

```ts
const listResponse = await client.tasksApi.withFetchAll().listTasks(projectId, options);
const tasks = listResponse.data.map((entry) => entry.data); // ResponseList<T>

const createResponse = await client.tasksApi.addTask(projectId, request);
const task = createResponse.data; // ResponseObject<T>
```

### Typed Request Models

```ts
const request: TasksModel.CreateTaskRequest = {
  title: 'My Task',
  languageId: 'de',
  type: 0,
  fileIds: [12],
};
```

### Error Handling

```ts
import { CrowdinError, CrowdinValidationError } from '@crowdin/crowdin-api-client';

try {
  // API call
} catch (error) {
  if (error instanceof CrowdinValidationError) throw error;
  if (error instanceof CrowdinError) throw error;
  throw error;
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Guessing endpoint methods from memory | Validate in local `index.d.ts` first |
| Treating list response as object response | Check `ResponseList<T>` vs `ResponseObject<T>` and map accordingly |
| Weakening or bypassing model typing | Use client `*Model` types in service signatures and fixtures |
| Manual pagination loops by default | Prefer `.withFetchAll()` unless custom batching is required |
| Uploading file directly to `createFile` | Create storage first, then pass `storageId` |
| Catching all errors as generic | Branch `CrowdinValidationError` and `CrowdinError` explicitly |

## Verification Gate

After changing API-client usage:

1. Run lint/type checks in the current project.
2. Run at least one targeted test for the modified API flow.
3. If tests fail on strict typing, fix fixture/model typing instead of loosening production types.

## Review Checklist

- Correct API module and method for the task.
- Request models are explicit and include required fields.
- Response mapping matches envelope shape.
- Type safety is preserved without bypassing model contracts.
- Pagination strategy matches expected volume.
- Retry/timeout/runtime options fit environment.
- Error handling distinguishes validation from generic API errors.

Reference docs: [Crowdin API Client modules](https://crowdin.github.io/crowdin-api-client-js/modules.html)
