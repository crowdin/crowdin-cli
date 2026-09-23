import type { SuiteContext } from './suite.ts';

/** The first entry whose `data` satisfies `predicate`, or a thrown error naming what was missing. */
function requireMatch<T>(entries: { data: T }[], predicate: (data: T) => boolean, what: string): T {
  const match = entries.find((entry) => predicate(entry.data));

  if (!match) {
    throw new Error(`${what} not found via the API`);
  }

  return match.data;
}

/** Every source file path in the project, sorted. */
export async function projectFilePaths(ctx: SuiteContext): Promise<string[]> {
  const files = await ctx.client.sourceFilesApi.listProjectFiles(ctx.project.id, { recursion: '1' });
  return files.data.map((file) => file.data.path).sort();
}

/** The id of the project string whose text is exactly `text`, optionally narrowed to a branch or file. */
export async function findStringId(
  ctx: SuiteContext,
  text: string,
  scope: { branchId?: number; fileId?: number } = {},
): Promise<number> {
  const response = await ctx.client.sourceStringsApi
    .withFetchAll()
    .listProjectStrings(ctx.project.id, { ...scope, filter: text });
  return requireMatch(response.data, (string) => string.text === text, `String '${text}'`).id;
}

export async function findBranch(ctx: SuiteContext, name: string, projectId = ctx.project.id) {
  const response = await ctx.client.sourceFilesApi.withFetchAll().listProjectBranches(projectId, { name });
  return requireMatch(response.data, (branch) => branch.name === name, `Branch '${name}'`);
}

export async function findFileId(ctx: SuiteContext, projectPath: string): Promise<number> {
  const response = await ctx.client.sourceFilesApi.withFetchAll().listProjectFiles(ctx.project.id);
  return requireMatch(response.data, (file) => file.path === projectPath, `File '${projectPath}'`).id;
}

export async function findCommentId(ctx: SuiteContext, text: string): Promise<number> {
  const response = await ctx.client.stringCommentsApi.withFetchAll().listStringComments(ctx.project.id);
  return requireMatch(response.data, (comment) => comment.text === text, `Comment '${text}'`).id;
}

export async function findGlossaryId(ctx: SuiteContext, name: string): Promise<number> {
  const response = await ctx.client.glossariesApi.withFetchAll().listGlossaries();
  return requireMatch(response.data, (glossary) => glossary.name === name, `Glossary '${name}'`).id;
}

export async function findTmId(ctx: SuiteContext, name: string): Promise<number> {
  const response = await ctx.client.translationMemoryApi.withFetchAll().listTm();
  return requireMatch(response.data, (tm) => tm.name === name, `Translation memory '${name}'`).id;
}

export async function findStyleGuideId(ctx: SuiteContext, name: string): Promise<number> {
  const response = await ctx.client.styleGuidesApi.withFetchAll().listStyleGuides();
  return requireMatch(response.data, (guide) => guide.name === name, `Style guide '${name}'`).id;
}

export async function translationCount(ctx: SuiteContext, stringId: number, languageId: string): Promise<number> {
  const response = await ctx.client.stringTranslationsApi.listStringTranslations(ctx.project.id, stringId, languageId);
  return response.data.length;
}
