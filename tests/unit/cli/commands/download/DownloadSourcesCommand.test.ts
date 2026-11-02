import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { Client } from '@crowdin/crowdin-api-client';
import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import AdmZip from 'adm-zip';
import type { Command } from 'commander';
import DownloadCommand from '@/cli/commands/download/DownloadCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { BranchService } from '@/cli/services/BranchService.ts';
import type { FileService } from '@/cli/services/FileService.ts';
import type { ProjectService } from '@/cli/services/ProjectService.ts';
import type { TranslationService } from '@/cli/services/TranslationService.ts';
import type { Output } from '@/cli/utils/output.ts';
import type { Config } from '@/lib/config.ts';
import {
  config,
  createCommandContext,
  createDownloadServices,
  globalOptions,
  respondWithZip,
} from './downloadTestHelpers.ts';

describe('DownloadSourcesCommand', () => {
  let tempDir: string;
  let commandContext: Command & { args?: string[] };
  let apiClient: Client;
  let output: Output;
  let projectService: ProjectService;
  let branchService: BranchService;
  let fileService: FileService;
  let translationService: TranslationService;

  beforeEach(async () => {
    ({ tempDir, apiClient, output, projectService, branchService, fileService, translationService } =
      await createDownloadServices());
    commandContext = createCommandContext(globalOptions);
  });

  afterEach(async () => {
    mock.restore();
    await rm(tempDir, { recursive: true, force: true });
  });

  const createDownloadCommand = (configOverrides: Partial<Config> = {}) => {
    return new DownloadCommand(
      async () => ({
        ...config,
        basePath: tempDir,
        ...configOverrides,
      }),
      () => output,
      async () => projectService,
      async () => branchService,
      async () => fileService,
      async () => translationService,
    );
  };

  describe('sources', () => {
    test('rejects string-based projects', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123, type: ProjectsGroupsModel.Type.STRINGS_BASED },
      } as never);
      const listFiles = spyOn(apiClient.sourceFilesApi, 'listProjectFiles');

      expect(downloadCommand.sourcesAction(commandContext)).rejects.toThrow(
        'File management is not available for string-based projects',
      );
      expect(listFiles).not.toHaveBeenCalled();
    });

    test('downloads source files', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/resources/en/messages.json' } }],
      } as never);
      const getDownloadUrlSpy = spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue(
        'https://example.test/messages.json',
      );
      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response('source content'));

      await downloadCommand.sourcesAction(commandContext);

      expect(getDownloadUrlSpy).toHaveBeenCalledWith(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://example.test/messages.json');

      const writtenFile = await Bun.file(join(tempDir, 'resources', 'en', 'messages.json')).text();
      expect(writtenFile).toBe('source content');
    });

    test('handles dry-run mode for sources', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      const listFiles = spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/docs/readme.md' } }],
      } as never);
      const getDownloadUrl = spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue('https://example.test');

      commandContext = createCommandContext({
        ...globalOptions,
        dryrun: true,
      });

      await downloadCommand.sourcesAction(commandContext);

      expect(listFiles).toHaveBeenCalledTimes(1);
      expect(getDownloadUrl).not.toHaveBeenCalled();
    });

    // A machine --output is a parseable contract, so a dry run has to serialize through
    // output.table for every machine format, not just 'plain' — output.log is text-only, so
    // checking `=== 'plain'` leaves json and toon printing nothing at all.
    test.each(['json', 'toon', 'plain'])('dry-run sources emits the paths for --output=%s', async (format) => {
      const downloadCommand = createDownloadCommand();
      const log = spyOn(console, 'log').mockImplementation(() => {});

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({ data: { id: 123 } } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/resources/en/messages.json' } }],
      } as never);

      commandContext = createCommandContext({ ...globalOptions, dryrun: true, output: format });

      await downloadCommand.sourcesAction(commandContext);

      expect(log.mock.calls.flat().join('\n')).toContain('resources/en/messages.json');
    });

    test('filters sources by branch', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({
        data: [{ data: { id: 55, name: 'main' } }],
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [],
      } as never);

      commandContext = createCommandContext({
        ...globalOptions,
        branch: 'main',
      });

      await downloadCommand.sourcesAction(commandContext);

      expect(apiClient.sourceFilesApi.listProjectFiles).toHaveBeenCalledWith(123, {
        branchId: 55,
        recursion: '1',
      });
    });

    // Files inside a branch carry the branch in their project path; the config patterns never do.
    // Without stripping it, every path missed its pattern and the command downloaded nothing.
    test('downloads branch sources despite the branch prefix in their path', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({
        data: [{ data: { id: 55, name: 'main' } }],
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/main/resources/en/messages.json', branchId: 55 } }],
      } as never);
      const getDownloadUrlSpy = spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue(
        'https://example.test/messages.json',
      );
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('branch content'));

      commandContext = createCommandContext({ ...globalOptions, branch: 'main' });

      await downloadCommand.sourcesAction(commandContext);

      expect(getDownloadUrlSpy).toHaveBeenCalledWith(1);

      const writtenFile = await Bun.file(join(tempDir, 'resources', 'en', 'messages.json')).text();
      expect(writtenFile).toBe('branch content');
    });

    test('fails when branch not found for sources', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectBranches').mockResolvedValue({
        data: [],
      } as never);

      commandContext = createCommandContext({
        ...globalOptions,
        branch: 'nonexistent',
      });

      expect(downloadCommand.sourcesAction(commandContext)).rejects.toThrow(
        new CliError("Project doesn't contain the 'nonexistent' branch"),
      );
    });

    test('downloads reviewed source files', async () => {
      const downloadCommand = createDownloadCommand();
      const buildId = 77;

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123, sourceLanguageId: 'en' },
      } as never);
      spyOn(projectService, 'isEnterprise').mockReturnValue(true);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/resources/en/messages.json' } }],
      } as never);
      const buildReviewedSpy = spyOn(fileService, 'buildReviewedSources').mockResolvedValue({ id: buildId } as never);
      const downloadUrlSpy = spyOn(fileService, 'getReviewedSourcesDownloadUrl').mockResolvedValue(
        'https://example.test/reviewed.zip',
      );
      respondWithZip();

      commandContext = createCommandContext({ ...globalOptions, reviewed: true });

      await downloadCommand.sourcesAction(commandContext);

      expect(buildReviewedSpy).toHaveBeenCalledWith(undefined);
      expect(downloadUrlSpy).toHaveBeenCalledWith(buildId);
    });

    test('throws when reviewed sources build fails', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123, sourceLanguageId: 'en' },
      } as never);
      spyOn(projectService, 'isEnterprise').mockReturnValue(true);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/resources/en/messages.json' } }],
      } as never);
      spyOn(fileService, 'buildReviewedSources').mockRejectedValue(new CliError('Reviewed sources build failed'));

      commandContext = createCommandContext({ ...globalOptions, reviewed: true });

      expect(downloadCommand.sourcesAction(commandContext)).rejects.toThrow(
        new CliError('Reviewed sources build failed'),
      );
    });

    test('downloads the remaining sources when one fails, then reports the failure', async () => {
      const downloadCommand = createDownloadCommand();
      const log = spyOn(console, 'log').mockImplementation(() => {});
      const error = spyOn(output, 'error');

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [
          { data: { id: 1, path: '/resources/en/broken.json' } },
          { data: { id: 2, path: '/resources/en/messages.json' } },
        ],
      } as never);
      spyOn(fileService, 'getSourceFileDownloadUrl').mockImplementation(async (fileId: number) => {
        if (fileId === 1) {
          throw new Error('Network error');
        }

        return 'https://example.test/messages.json';
      });
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('source content'));

      expect(downloadCommand.sourcesAction(commandContext)).rejects.toThrow('Current execution finished with errors');

      expect(await Bun.file(join(tempDir, 'resources', 'en', 'messages.json')).text()).toBe('source content');
      expect(error.mock.calls.flat().join('\n')).toContain("Failed to download 'resources/en/broken.json'");
      expect(log.mock.calls.flat().join('\n')).toContain('resources/en/messages.json');
    });

    test('does not download project files that do not match a config pattern', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [
          { data: { id: 1, path: '/resources/en/messages.json' } },
          { data: { id: 2, path: '/unrelated/notes.txt' } },
        ],
      } as never);
      const getDownloadUrlSpy = spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue(
        'https://example.test/messages.json',
      );
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('source content'));

      await downloadCommand.sourcesAction(commandContext);

      expect(getDownloadUrlSpy).toHaveBeenCalledTimes(1);
      expect(getDownloadUrlSpy).toHaveBeenCalledWith(1);
      expect(await Bun.file(join(tempDir, 'unrelated', 'notes.txt')).exists()).toBe(false);
    });

    test('with manager access, filters out files whose export pattern does not match the translation', async () => {
      const downloadCommand = createDownloadCommand();

      // languageMapping marks manager access, enabling the export-pattern compatibility filter.
      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123, languageMapping: {} },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [
          {
            data: {
              id: 1,
              path: '/resources/en/messages.json',
              exportOptions: { exportPattern: '/%locale%/%original_file_name%' },
            },
          },
          {
            data: {
              id: 2,
              path: '/resources/en/strings.json',
              exportOptions: { exportPattern: '/somewhere-else/strings.json' },
            },
          },
        ],
      } as never);
      const getDownloadUrlSpy = spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue(
        'https://example.test/messages.json',
      );
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('source content'));

      await downloadCommand.sourcesAction(commandContext);

      // Only file 1's export pattern is a suffix of the config translation, so file 2 is skipped.
      expect(getDownloadUrlSpy).toHaveBeenCalledTimes(1);
      expect(getDownloadUrlSpy).toHaveBeenCalledWith(1);
    });

    test('skips source files matching an ignore pattern', async () => {
      const downloadCommand = new DownloadCommand(
        async () => ({
          ...config,
          basePath: tempDir,
          files: [
            {
              source: '/resources/en/*.json',
              translation: '/%locale%/%original_file_name%',
              ignore: ['/resources/en/secret.json'],
            },
          ],
        }),
        () => output,
        async () => projectService,
        async () => branchService,
        async () => fileService,
        async () => translationService,
      );

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [
          { data: { id: 1, path: '/resources/en/messages.json' } },
          { data: { id: 2, path: '/resources/en/secret.json' } },
        ],
      } as never);
      const getDownloadUrlSpy = spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue(
        'https://example.test/messages.json',
      );
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('source content'));

      await downloadCommand.sourcesAction(commandContext);

      expect(getDownloadUrlSpy).toHaveBeenCalledTimes(1);
      expect(getDownloadUrlSpy).toHaveBeenCalledWith(1);
    });

    test('applies dest directly when source has ** and dest has no wildcard', async () => {
      const downloadCommand = new DownloadCommand(
        async () => ({
          ...config,
          basePath: tempDir,
          files: [
            {
              source: '/resources/**/*.json',
              translation: '/%locale%/%original_file_name%',
              dest: '/uploaded/%original_file_name%',
            },
          ],
        }),
        () => output,
        async () => projectService,
        async () => branchService,
        async () => fileService,
        async () => translationService,
      );

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/uploaded/messages.json' } }],
      } as never);
      spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue('https://example.test/messages.json');
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('dest content'));

      await downloadCommand.sourcesAction(commandContext);

      // Branch (a): dest applied directly with placeholders resolved.
      expect(await Bun.file(join(tempDir, 'uploaded', 'messages.json')).text()).toBe('dest content');
    });

    test('derives dest from the source pattern via replaceUnaryAsterisk when source has no **', async () => {
      const downloadCommand = new DownloadCommand(
        async () => ({
          ...config,
          basePath: tempDir,
          files: [
            {
              source: '/resources/en/*.json',
              translation: '/%locale%/%original_file_name%',
              dest: '/uploaded/%original_file_name%',
            },
          ],
        }),
        () => output,
        async () => projectService,
        async () => branchService,
        async () => fileService,
        async () => translationService,
      );

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/uploaded/messages.json' } }],
      } as never);
      spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue('https://example.test/messages.json');
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('source content'));

      await downloadCommand.sourcesAction(commandContext);

      // Else branch: the filename segment is substituted into the source pattern, so the file lands
      // at its source-side location.
      expect(await Bun.file(join(tempDir, 'resources', 'en', 'messages.json')).text()).toBe('source content');
    });

    test('warns when a config pattern matches no project files', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/unrelated/notes.txt' } }],
      } as never);
      const getDownloadUrlSpy = spyOn(fileService, 'getSourceFileDownloadUrl');
      const warningSpy = spyOn(output, 'warning');

      await downloadCommand.sourcesAction(commandContext);

      expect(warningSpy).toHaveBeenCalledWith(expect.stringContaining('No sources found for'));
      expect(getDownloadUrlSpy).not.toHaveBeenCalled();
    });

    test('warns about preserve_hierarchy being disabled', async () => {
      const downloadCommand = new DownloadCommand(
        async () => ({ ...config, basePath: tempDir, preserveHierarchy: false }),
        () => output,
        async () => projectService,
        async () => branchService,
        async () => fileService,
        async () => translationService,
      );

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123 },
      } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({ data: [] } as never);
      const warningSpy = spyOn(output, 'warning');

      await downloadCommand.sourcesAction(commandContext);

      expect(warningSpy).toHaveBeenCalledWith(
        expect.stringContaining("'preserve_hierarchy' parameter is set to 'false'"),
      );
    });

    test('--reviewed warns and returns for non-enterprise projects before loading the project', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(projectService, 'isEnterprise').mockReturnValue(false);
      // The enterprise guard runs before the project is fetched, so loadProject and
      // the build are never reached.
      const loadProjectSpy = spyOn(projectService, 'loadProject');
      const buildReviewedSpy = spyOn(fileService, 'buildReviewedSources');
      const warningSpy = spyOn(output, 'warning');

      commandContext = createCommandContext({ ...globalOptions, reviewed: true });

      await downloadCommand.sourcesAction(commandContext);

      expect(warningSpy).toHaveBeenCalledWith('Operation is available only for Crowdin Enterprise');
      expect(loadProjectSpy).not.toHaveBeenCalled();
      expect(buildReviewedSpy).not.toHaveBeenCalled();
    });

    test('--reviewed extracts matched files from the source-language-REV directory', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123, sourceLanguageId: 'en' },
      } as never);
      spyOn(projectService, 'isEnterprise').mockReturnValue(true);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/resources/en/messages.json' } }],
      } as never);
      spyOn(fileService, 'buildReviewedSources').mockResolvedValue({ id: 77 } as never);
      spyOn(fileService, 'getReviewedSourcesDownloadUrl').mockResolvedValue('https://example.test/reviewed.zip');
      respondWithZip([
        { entryName: 'en-REV/resources/en/messages.json', content: 'reviewed content' },
        { entryName: 'en-REV/unrelated/other.json', content: 'noise' },
      ]);

      commandContext = createCommandContext({ ...globalOptions, reviewed: true });

      await downloadCommand.sourcesAction(commandContext);

      expect(await Bun.file(join(tempDir, 'resources/en/messages.json')).text()).toBe('reviewed content');
      expect(await Bun.file(join(tempDir, 'unrelated/other.json')).exists()).toBe(false);
    });
  });

  // output.success is text-only, so before this the machine formats saw an empty stdout for a
  // command that had written real files to disk.
  describe('machine-format summary', () => {
    const summary = () => {
      const calls = (console.log as ReturnType<typeof mock>).mock.calls;
      return JSON.parse(String(calls.at(-1)?.[0]));
    };

    test('reports each downloaded source', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({ data: { id: 123 } } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/resources/en/messages.json' } }],
      } as never);
      spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue('https://example.test/messages.json');
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('source content'));

      await downloadCommand.sourcesAction(commandContext);

      expect(summary()).toEqual([{ path: 'resources/en/messages.json', action: 'downloaded', reason: null }]);
    });

    // The server lists project files by id, not by path. The summary does not sort — it relies
    // on collectSourceDownloads having done so — which makes the ordering worth pinning here.
    test('reports files in path order, not the order the server listed them', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({ data: { id: 123 } } as never);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/resources/en/b.json' } }, { data: { id: 2, path: '/resources/en/a.json' } }],
      } as never);
      spyOn(fileService, 'getSourceFileDownloadUrl').mockResolvedValue('https://example.test/x.json');
      spyOn(globalThis, 'fetch').mockImplementation((async () => new Response('x')) as unknown as typeof fetch);

      await downloadCommand.sourcesAction(commandContext);

      expect((summary() as { path: string }[]).map(({ path }) => path)).toEqual([
        'resources/en/a.json',
        'resources/en/b.json',
      ]);
    });

    test('records a source missing from the reviewed archive as skipped', async () => {
      const downloadCommand = createDownloadCommand();

      spyOn(apiClient.projectsGroupsApi, 'getProject').mockResolvedValue({
        data: { id: 123, sourceLanguageId: 'en', userRole: 'manager' },
      } as never);
      spyOn(projectService, 'isEnterprise').mockReturnValue(true);
      spyOn(apiClient.sourceFilesApi, 'listProjectFiles').mockResolvedValue({
        data: [{ data: { id: 1, path: '/resources/en/messages.json' } }],
      } as never);
      spyOn(fileService, 'buildReviewedSources').mockResolvedValue({ id: 5 } as never);
      spyOn(fileService, 'getReviewedSourcesDownloadUrl').mockResolvedValue('https://example.test/reviewed.zip');

      // An archive that contains nothing matching the project file.
      const zip = new AdmZip();
      zip.addFile('en-REV/unrelated/other.json', Buffer.from('other'));
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response(zip.toBuffer()));

      await downloadCommand.sourcesAction(createCommandContext({ ...globalOptions, reviewed: true }));

      expect(summary()).toEqual([
        { path: 'resources/en/messages.json', action: 'skipped', reason: 'not in the reviewed archive' },
      ]);
    });
  });
});
