import { spyOn } from 'bun:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@crowdin/crowdin-api-client';
import AdmZip from 'adm-zip';
import type { Command } from 'commander';
import type { GlobalOptions } from '@/cli/options.ts';
import { BranchService } from '@/cli/services/BranchService.ts';
import { FileService } from '@/cli/services/FileService.ts';
import { ProjectService } from '@/cli/services/ProjectService.ts';
import { TranslationService } from '@/cli/services/TranslationService.ts';
import { createOutput } from '@/cli/utils/output.ts';
import type { ProjectConfig } from '@/lib/config.ts';

// Mock fetch to return a real zip so tests exercise the actual adm-zip read path
// (new AdmZip(path) -> getEntries -> getData) instead of a globally-mocked module. Uses
// mockImplementation so each call gets a fresh Response (a body can only be read once, and
// some downloads fetch several archives). Each call serves the next archive, the last one repeating.
export const respondWithZip = (...archives: { entryName: string; content: string }[][]) => {
  let call = 0;

  return spyOn(globalThis, 'fetch').mockImplementation((async () => {
    const zip = new AdmZip();

    for (const { entryName, content } of archives[Math.min(call++, archives.length - 1)] ?? []) {
      zip.addFile(entryName, Buffer.from(content));
    }

    return new Response(zip.toBuffer());
  }) as unknown as typeof fetch);
};

export const config: ProjectConfig = {
  projectId: 123,
  apiToken: 'a'.repeat(80),
  basePath: '.',
  baseUrl: 'https://api.crowdin.com',
  preserveHierarchy: true,
  ignoreHiddenFiles: true,
  files: [
    {
      source: '/resources/en/*.json',
      translation: '/resources/%locale%/%original_file_name%',
    },
  ],
};

export const globalOptions: GlobalOptions = {
  verbose: false,
  config: '',
  colors: false,
  progress: false,
  output: 'json',
};

type DownloadTestOptions = GlobalOptions & {
  branch?: string;
  language?: string[];
  excludeLanguage?: string[];
  pseudo?: boolean;
  skipUntranslatedStrings?: boolean;
  skipUntranslatedFiles?: boolean;
  exportOnlyApproved?: boolean;
  keepArchive?: boolean;
  all?: boolean;
  dryrun?: boolean;
  tree?: boolean;
  ignoreMatch?: boolean;
  reviewed?: boolean;
};

export const createCommandContext = (options: DownloadTestOptions, args: string[] = []) => {
  return {
    optsWithGlobals: () => options,
    args,
  } as unknown as Command & { args?: string[] };
};

export async function createDownloadServices() {
  const tempDir = await mkdtemp(join(tmpdir(), 'crowdin-download-command-'));
  const apiClient = new Client({ token: config.apiToken ?? '' });
  const output = createOutput(globalOptions);

  spyOn(console, 'log').mockImplementation(() => {});
  spyOn(console, 'table').mockImplementation(() => {});

  return {
    tempDir,
    apiClient,
    output,
    projectService: new ProjectService(apiClient, output, config.projectId),
    branchService: new BranchService(apiClient, config.projectId),
    fileService: new FileService(apiClient, output, config.projectId),
    translationService: new TranslationService(apiClient, output, config.projectId),
  };
}
