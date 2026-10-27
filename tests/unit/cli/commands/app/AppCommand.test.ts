import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ApplicationsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { buildCommand } from '@/cli/builder.ts';
import AppCommand from '@/cli/commands/app/AppCommand.ts';
import CliError, { ExitCode } from '@/cli/errors/CliError.ts';
import NotFoundError from '@/cli/errors/NotFoundError.ts';
import ValidationError from '@/cli/errors/ValidationError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { AppService } from '@/cli/services/AppService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';
import { parseApiMethods } from '@/lib/apps/manifest.ts';

describe('AppCommand', () => {
  let output: Output;
  let appService: {
    list: ReturnType<typeof mock<AppService['list']>>;
    findManifestUrl: ReturnType<typeof mock<AppService['findManifestUrl']>>;
    installByManifestUrl: ReturnType<typeof mock<AppService['installByManifestUrl']>>;
    uninstall: ReturnType<typeof mock<AppService['uninstall']>>;
    listMethods: ReturnType<typeof mock<AppService['listMethods']>>;
    fetchOpenApi: ReturnType<typeof mock<AppService['fetchOpenApi']>>;
    callApi: ReturnType<typeof mock<AppService['callApi']>>;
    requestUrl: ReturnType<typeof mock<AppService['requestUrl']>>;
  };

  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    output: 'json',
  };

  const createCommandContext = (globalCommandOptions: unknown, args: string[] = []) => {
    return {
      optsWithGlobals: () => globalCommandOptions,
      opts: () => ({}),
      args,
      help: mock(() => {}),
    } as unknown as Command;
  };

  const createAppCommand = () => {
    return new AppCommand(
      () => output,
      async () => appService as unknown as AppService,
    );
  };

  const createApp = (overrides: Partial<ApplicationsModel.Application>): ApplicationsModel.Application => ({
    identifier: 'test-app',
    name: 'Test App',
    description: '',
    logo: '',
    baseUrl: '',
    manifestUrl: 'https://example.com/manifest.json',
    createdAt: '',
    modules: [],
    scopes: [],
    permissions: {
      user: { value: 'all', ids: [] },
      project: { value: 'own', ids: [] },
    },
    defaultPermissions: {},
    limitReached: false,
    ...overrides,
  });

  const BASE_URL = 'https://zendesk-guide.app.crowdin.net';

  const zendeskManifest = {
    modules: {
      api: [
        {
          key: 'settings-get',
          name: 'Get App Settings',
          url: '/settings',
          method: 'GET',
          documentationUrl: '/api-docs#tag/Settings/operation/settings.get',
        },
        { key: 'settings-set', name: 'Update App Settings', url: '/settings', method: 'POST' },
        {
          key: 'crowdin-update-api',
          name: 'Update Crowdin',
          url: '/crowdin-update',
          method: 'POST',
          description: 'Update crowdin data',
          documentationUrl: '/api-docs#tag/Files/operation/crowdin.update',
        },
      ],
    },
  };

  const spec = {
    openapi: '3.0.0',
    paths: {
      '/crowdin-update': {
        post: {
          operationId: 'crowdin.update',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['projectId'],
                  properties: {
                    projectId: { type: 'integer', description: 'Project Identifier. Get via the API.' },
                    entryIds: { type: 'array', items: { type: 'string' } },
                    uploadTranslations: { type: 'boolean', default: false, description: 'Upload translations. Slow.' },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const withOutput = (format: string, extra: Record<string, unknown> = {}) => {
    const options = { ...globalOptions, output: format, ...extra };
    output = createOutput(options as GlobalOptions);

    return options;
  };

  const printed = () =>
    (console.log as unknown as ReturnType<typeof mock>).mock.calls.map((call) => call[0]).join('\n');

  const run = async (argv: string[]) => {
    const command = buildCommand(createAppCommand().getDefinition());

    command.exitOverride();
    await command.parseAsync(argv, { from: 'user' });
  };

  beforeEach(() => {
    output = createOutput(globalOptions);
    appService = {
      list: mock(async () => []),
      findManifestUrl: mock(async () => null),
      installByManifestUrl: mock(async () => createApp({ identifier: 'github', name: 'GitHub' })),
      uninstall: mock(async () => {}),
      listMethods: mock(async () => parseApiMethods(zendeskManifest, BASE_URL)),
      fetchOpenApi: mock(async () => {
        throw new Error('offline');
      }),
      callApi: mock(async () => ({ ok: true })),
      requestUrl: mock((app, request) => `https://api.crowdin.com/api/v2/applications/${app}/api/${request.path}`),
    };

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
  });

  test('defaultAction calls command help', async () => {
    const cmd = createAppCommand();
    const commandContext = createCommandContext(globalOptions);

    await cmd.defaultAction(commandContext);

    expect(commandContext.help).toHaveBeenCalledTimes(1);
  });

  test('listAction prints no applications message', async () => {
    const textOutput = createOutput({ ...globalOptions, output: 'text' });
    const infoSpy = spyOn(textOutput, 'info');
    const cmd = new AppCommand(
      () => textOutput,
      async () => appService as unknown as AppService,
    );

    await cmd.listAction(createCommandContext({ ...globalOptions, output: 'text' }));

    expect(infoSpy).toHaveBeenCalledWith('No applications found');
  });

  test('listAction prints identifier and name per application in text format', async () => {
    const textOutput = createOutput({ ...globalOptions, output: 'text' });
    const cmd = new AppCommand(
      () => textOutput,
      async () => appService as unknown as AppService,
    );
    appService.list.mockResolvedValue([
      createApp({ identifier: 'github', name: 'GitHub' }),
      createApp({ identifier: 'slack', name: 'Slack' }),
    ]);

    await cmd.listAction(createCommandContext({ ...globalOptions, output: 'text' }));

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('github GitHub'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('slack Slack'));
  });

  test('listAction prints the identifier alone in plain format', async () => {
    const plainOutput = createOutput({ ...globalOptions, output: 'plain' });
    const cmd = new AppCommand(
      () => plainOutput,
      async () => appService as unknown as AppService,
    );
    appService.list.mockResolvedValue([createApp({ identifier: 'github', name: 'GitHub' })]);

    await cmd.listAction(createCommandContext({ ...globalOptions, output: 'plain' }));

    expect(console.log).toHaveBeenCalledWith('github');
  });

  test('listAction serializes the applications themselves in structured formats', async () => {
    const cmd = createAppCommand();
    const apps = [createApp({ identifier: 'github', name: 'GitHub' })];
    appService.list.mockResolvedValue(apps);

    await cmd.listAction(createCommandContext({ ...globalOptions, output: 'json' }));

    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify(
        apps.map(({ identifier, name }) => ({ identifier, name })),
        null,
        2,
      ),
    );
  });

  test('installAction validates identifier', async () => {
    const cmd = createAppCommand();

    expect(cmd.installAction(createCommandContext(globalOptions))).rejects.toThrow(
      new CliError('Application identifier can not be empty'),
    );
  });

  test('installAction throws not found when manifest is missing', async () => {
    const cmd = createAppCommand();
    appService.findManifestUrl.mockResolvedValue(null);

    expect(cmd.installAction(createCommandContext(globalOptions, ['unknown-app']))).rejects.toThrow(
      new CliError("Application with identifier 'unknown-app' doesn't exist in Crowdin Store"),
    );
  });

  test('installAction installs app by manifest URL', async () => {
    const textOutput = createOutput({ ...globalOptions, output: 'text' });
    const successSpy = spyOn(textOutput, 'success');
    const cmd = new AppCommand(
      () => textOutput,
      async () => appService as unknown as AppService,
    );
    appService.findManifestUrl.mockResolvedValue('https://example.com/manifest.json');

    await cmd.installAction(createCommandContext({ ...globalOptions, output: 'text' }, ['github']));

    expect(appService.findManifestUrl).toHaveBeenCalledWith('github');
    expect(appService.installByManifestUrl).toHaveBeenCalledWith('https://example.com/manifest.json');
    expect(successSpy).toHaveBeenCalledWith('Application has been installed');
  });

  // 'Application has been installed' is text-only and names nothing, so a machine format saw an
  // empty stdout for an install that had just happened.
  test('installAction echoes the installed app in a machine format', async () => {
    const item = spyOn(output, 'item');
    const cmd = createAppCommand();

    appService.findManifestUrl.mockResolvedValue('https://example.com/manifest.json');

    await cmd.installAction(createCommandContext(globalOptions, ['github']));

    expect(item).toHaveBeenCalledWith(createApp({ identifier: 'github', name: 'GitHub' }), expect.anything(), {
      mark: false,
    });
  });

  test('uninstallAction validates identifier', async () => {
    const cmd = createAppCommand();

    expect(cmd.uninstallAction(createCommandContext(globalOptions))).rejects.toThrow(
      new CliError('Application identifier can not be empty'),
    );
  });

  test('uninstallAction uninstalls app without force by default', async () => {
    const textOutput = createOutput({ ...globalOptions, output: 'text' });
    const successSpy = spyOn(textOutput, 'success');
    const cmd = new AppCommand(
      () => textOutput,
      async () => appService as unknown as AppService,
    );

    await cmd.uninstallAction(createCommandContext({ ...globalOptions, output: 'text' }, ['github']));

    expect(appService.uninstall).toHaveBeenCalledWith('github', false);
    expect(successSpy).toHaveBeenCalledWith('Application has been uninstalled');
  });

  test('accepts letters, digits, underscores and dashes in the identifier', async () => {
    await createAppCommand().uninstallAction(createCommandContext(globalOptions, ['My_App-2']));

    expect(appService.uninstall).toHaveBeenCalledWith('My_App-2', false);
  });

  test('uninstallAction uninstalls app with --force', async () => {
    const cmd = createAppCommand();

    await cmd.uninstallAction(createCommandContext({ ...globalOptions, force: true }, ['github']));

    expect(appService.uninstall).toHaveBeenCalledWith('github', true);
  });

  describe('list --verbose', () => {
    const restricted = createApp({
      identifier: 'zendesk-guide',
      name: 'Zendesk Guide',
      baseUrl: BASE_URL,
      permissions: { user: { value: 'all', ids: [] }, project: { value: 'restricted', ids: [12, 34] } },
    });

    test('adds the project scope and base URL in text', async () => {
      const options = withOutput('text', { verbose: true });
      appService.list.mockResolvedValue([restricted, createApp({ identifier: 'all', name: 'All', baseUrl: '' })]);

      await createAppCommand().listAction(createCommandContext(options));

      expect(printed()).toContain(`zendesk-guide Zendesk Guide (projects: 12, 34) ${BASE_URL}`);
      expect(printed()).toContain('all All (all projects)');
    });

    test('claims no scope when the installation carries no permissions', async () => {
      const options = withOutput('text', { verbose: true });
      appService.list.mockResolvedValue([
        createApp({ identifier: 'bare', name: 'Bare', baseUrl: '', permissions: undefined as never }),
      ]);

      await createAppCommand().listAction(createCommandContext(options));

      expect(printed()).toEndWith('bare Bare');
    });

    test('adds baseUrl and permissions in json and keeps plain unchanged', async () => {
      appService.list.mockResolvedValue([restricted]);

      await createAppCommand().listAction(createCommandContext(withOutput('json', { verbose: true })));
      expect(JSON.parse(printed())).toEqual([
        { identifier: 'zendesk-guide', name: 'Zendesk Guide', baseUrl: BASE_URL, permissions: restricted.permissions },
      ]);

      (console.log as unknown as ReturnType<typeof mock>).mockClear();
      await createAppCommand().listAction(createCommandContext(withOutput('plain', { verbose: true })));
      expect(printed()).toBe('zendesk-guide');
    });
  });

  describe('methodsAction', () => {
    test('adds the description and docs URL in verbose text', async () => {
      await createAppCommand().methodsAction(
        createCommandContext(withOutput('text', { verbose: true }), ['zendesk-guide']),
      );

      expect(printed()).toContain(
        `POST crowdin-update  Update Crowdin: Update crowdin data ${BASE_URL}/api-docs#tag/Files/operation/crowdin.update`,
      );
      expect(printed()).toContain('POST settings  Update App Settings\n');
    });

    test('lists methods in plain', async () => {
      await createAppCommand().methodsAction(createCommandContext(withOutput('plain'), ['zendesk-guide']));

      expect(appService.listMethods).toHaveBeenCalledWith('zendesk-guide');
      expect(printed()).toBe('GET settings\nPOST settings\nPOST crowdin-update');
    });

    test('lists methods in json', async () => {
      await createAppCommand().methodsAction(createCommandContext(withOutput('json'), ['zendesk-guide']));

      expect(JSON.parse(printed())[2]).toEqual({
        method: 'POST',
        path: 'crowdin-update',
        name: 'Update Crowdin',
        description: 'Update crowdin data',
      });
    });

    test.each([
      ['json', '[]'],
      ['plain', ''],
    ])('prints an empty list in %s', async (format, expected) => {
      appService.listMethods.mockResolvedValue([]);

      await createAppCommand().methodsAction(createCommandContext(withOutput(format), ['x']));

      expect(printed()).toBe(expected);
    });

    test('says so in text when there are no methods', async () => {
      appService.listMethods.mockResolvedValue([]);
      const options = withOutput('text');
      const info = spyOn(output, 'info');

      await createAppCommand().methodsAction(createCommandContext(options, ['x']));

      expect(info).toHaveBeenCalledWith("Application 'x' declares no API methods");
    });

    test('describes a method from its OpenAPI operation', async () => {
      appService.fetchOpenApi.mockResolvedValue(spec as never);

      await createAppCommand().methodsAction(
        createCommandContext(withOutput('text'), ['zendesk-guide', '/crowdin-update']),
      );

      expect(appService.fetchOpenApi).toHaveBeenCalledWith(`${BASE_URL}/api-docs/swagger.json`);
      expect(printed()).toBe(
        [
          'POST crowdin-update  Update Crowdin',
          'Update crowdin data',
          `Docs: ${BASE_URL}/api-docs#tag/Files/operation/crowdin.update`,
          'Body (application/json):',
          '  projectId           integer        required  Project Identifier…',
          '  entryIds            array<string>',
          '  uploadTranslations  boolean                  Upload translations…, default false',
          'Example:',
          "  crowdin app api zendesk-guide crowdin-update -X POST -F 'projectId=<integer>'",
        ].join('\n'),
      );
    });

    test('describes a method in plain and json', async () => {
      appService.fetchOpenApi.mockResolvedValue(spec as never);

      await createAppCommand().methodsAction(createCommandContext(withOutput('plain'), ['z', 'crowdin-update']));
      expect(printed()).toBe(
        'POST crowdin-update\nbody projectId integer required\nbody entryIds array<string> optional\nbody uploadTranslations boolean optional',
      );

      (console.log as unknown as ReturnType<typeof mock>).mockClear();
      await createAppCommand().methodsAction(createCommandContext(withOutput('json'), ['z', 'crowdin-update']));
      expect(JSON.parse(printed())).toMatchObject({
        method: 'POST',
        path: 'crowdin-update',
        key: 'crowdin-update-api',
        specUrl: `${BASE_URL}/api-docs/swagger.json`,
        operationId: 'crowdin.update',
        parameters: [],
        requestBody: { required: ['projectId'] },
      });
    });

    test('falls back to the manifest when the spec is unavailable', async () => {
      await createAppCommand().methodsAction(
        createCommandContext(withOutput('json', { method: 'get' }), ['zendesk-guide', 'settings']),
      );

      expect(JSON.parse(printed())).toMatchObject({
        method: 'GET',
        specUrl: null,
        operationId: null,
        parameters: null,
        requestBody: null,
      });
    });

    test('writes array fields with the [] form in the example', async () => {
      appService.fetchOpenApi.mockResolvedValue({
        openapi: '3.0.0',
        paths: {
          '/settings': {
            get: {
              parameters: [
                { name: 'ids', in: 'query', required: true, schema: { type: 'array', items: { type: 'integer' } } },
                { name: 'tags', in: 'query', required: true, schema: { type: 'array' } },
                { name: 'projectId', in: 'query', required: true, schema: { type: 'integer' } },
              ],
            },
          },
        },
      } as never);

      await createAppCommand().methodsAction(
        createCommandContext(withOutput('text', { method: 'GET' }), ['zendesk-guide', 'settings']),
      );

      expect(printed()).toEndWith(
        "  crowdin app api zendesk-guide settings -F 'ids[]=<integer>' -F 'tags[]=<any>' -F 'projectId=<integer>'",
      );
    });

    test('prints parameters in the plain description', async () => {
      appService.fetchOpenApi.mockResolvedValue({
        openapi: '3.0.0',
        paths: {
          '/settings': {
            get: { parameters: [{ name: 'projectId', in: 'query', required: true, schema: { type: 'integer' } }] },
          },
        },
      } as never);

      await createAppCommand().methodsAction(
        createCommandContext(withOutput('plain', { method: 'GET' }), ['zendesk-guide', 'settings']),
      );

      expect(printed()).toBe('GET settings\nparam projectId query integer required');
    });

    test('falls back to the manifest when the spec does not describe the method', async () => {
      appService.fetchOpenApi.mockResolvedValue({ openapi: '3.0.0', paths: {} } as never);
      const options = withOutput('text', { verbose: true, method: 'get' });
      const debug = spyOn(output, 'debug');

      await createAppCommand().methodsAction(createCommandContext(options, ['zendesk-guide', 'settings']));

      expect(debug).toHaveBeenCalledWith(
        `No OpenAPI description: ${BASE_URL}/api-docs/swagger.json describes no GET settings`,
      );
      expect(printed()).not.toContain('Parameters:');
    });

    test('asks for --method when a path has several verbs', async () => {
      expect(
        createAppCommand().methodsAction(createCommandContext(globalOptions, ['z', 'settings'])),
      ).rejects.toMatchObject({
        message: "'settings' is declared for GET and POST. Pass --method to choose one",
        exitCode: ExitCode.VALIDATION,
      });
    });

    test('rejects a verb the path does not declare', async () => {
      expect(
        createAppCommand().methodsAction(
          createCommandContext({ ...globalOptions, method: 'DELETE' }, ['z', 'settings']),
        ),
      ).rejects.toMatchObject({
        message: "Application 'z' declares 'settings' for GET and POST, not DELETE",
        exitCode: ExitCode.NOT_FOUND,
      });
    });

    test('rejects an undeclared path', async () => {
      expect(
        createAppCommand().methodsAction(createCommandContext(globalOptions, ['z', 'nope'])),
      ).rejects.toMatchObject({
        message: "Application 'z' declares no API method at 'nope'. Run 'crowdin app methods z' to list them",
        exitCode: ExitCode.NOT_FOUND,
      });
    });
  });

  describe('apiAction', () => {
    const inputFile = (content: string) => {
      const path = join(mkdtempSync(join(tmpdir(), 'crowdin-app-api-')), 'body.json');
      writeFileSync(path, content);
      return path;
    };

    test('sends the --input file as the body with POST', async () => {
      await createAppCommand().apiAction(
        createCommandContext(withOutput('json', { input: inputFile('{"projectId":12}') }), ['z', 'integration-update']),
      );

      expect(appService.callApi).toHaveBeenCalledWith('z', {
        method: 'POST',
        path: 'integration-update',
        query: '',
        body: { projectId: 12 },
      });
    });

    test('rejects an --input file that is not JSON', async () => {
      const path = inputFile('not json');

      expect(
        createAppCommand().apiAction(createCommandContext(withOutput('json', { input: path }), ['z', 'x'])),
      ).rejects.toMatchObject({
        message: expect.stringContaining(`Invalid --input '${path}': `),
        exitCode: ExitCode.VALIDATION,
      });
    });

    test('prints the dry run in text, with and without a body', async () => {
      await createAppCommand().apiAction(
        createCommandContext(withOutput('text', { dryrun: true, method: 'POST', typedField: ['projectId=12'] }), [
          'z',
          'crowdin-update',
        ]),
      );
      expect(printed()).toBe(
        'POST https://api.crowdin.com/api/v2/applications/z/api/crowdin-update\nBody:\n{\n  "projectId": 12\n}',
      );

      (console.log as unknown as ReturnType<typeof mock>).mockClear();
      await createAppCommand().apiAction(createCommandContext(withOutput('text', { dryrun: true }), ['z', 'settings']));
      expect(printed()).toBe('GET https://api.crowdin.com/api/v2/applications/z/api/settings');
    });

    test('prints the dry run as one line in plain', async () => {
      await createAppCommand().apiAction(
        createCommandContext(withOutput('plain', { dryrun: true, method: 'POST' }), ['z', 'crowdin-update']),
      );

      expect(printed()).toBe('POST https://api.crowdin.com/api/v2/applications/z/api/crowdin-update');
    });

    test('prints the result per format', async () => {
      appService.callApi.mockResolvedValue({ files: [{ id: 1 }] });

      for (const [format, expected] of [
        ['text', JSON.stringify({ files: [{ id: 1 }] }, null, 2)],
        ['plain', '{"files":[{"id":1}]}'],
        ['json', JSON.stringify({ files: [{ id: 1 }] }, null, 2)],
        ['toon', 'files[1]{id}:\n  1'],
      ]) {
        (console.log as unknown as ReturnType<typeof mock>).mockClear();
        await createAppCommand().apiAction(createCommandContext(withOutput(format as string), ['z', 'settings']));
        expect(printed()).toBe(expected as string);
      }
    });

    test('reports no content in text only', async () => {
      appService.callApi.mockResolvedValue(undefined);

      await createAppCommand().apiAction(createCommandContext(withOutput('json'), ['z', 'jobs']));
      expect(printed()).toBe('');

      await createAppCommand().apiAction(createCommandContext(withOutput('text'), ['z', 'jobs']));
      expect(printed()).toContain('Request completed with no content');
    });

    test('prints the request without sending it on --dryrun', async () => {
      await createAppCommand().apiAction(
        createCommandContext(withOutput('json', { dryrun: true, method: 'POST', typedField: ['projectId=12'] }), [
          'z',
          'crowdin-update',
        ]),
      );

      expect(appService.callApi).not.toHaveBeenCalled();
      expect(JSON.parse(printed())).toEqual({
        method: 'POST',
        url: 'https://api.crowdin.com/api/v2/applications/z/api/crowdin-update',
        body: { projectId: 12 },
      });
    });

    test('prints a null body on a GET dry run', async () => {
      await createAppCommand().apiAction(createCommandContext(withOutput('json', { dryrun: true }), ['z', 'settings']));

      expect(JSON.parse(printed())).toMatchObject({ method: 'GET', body: null });
    });

    describe('--wait', () => {
      const jobInfo = { method: 'GET', path: 'job-info', query: 'projectId=12&jobId=j1', body: undefined };
      const wait = (extra: Record<string, unknown>, args: string[] = ['z', 'crowdin-update']) =>
        createAppCommand().apiAction(createCommandContext(withOutput('json', { wait: true, ...extra }), args));
      const start = (extra: Record<string, unknown> = {}) =>
        wait({ method: 'POST', typedField: ['projectId=12'], ...extra });
      const resume = (fields = ['projectId=12', 'jobId=j1']) => wait({ field: fields }, ['z', 'job-info']);
      const responses = (...values: unknown[]) => {
        for (const value of values) {
          appService.callApi.mockResolvedValueOnce(value);
        }
      };

      beforeEach(() => {
        appService.listMethods.mockResolvedValue(
          parseApiMethods(
            { modules: { api: [...zendeskManifest.modules.api, { key: 'job', url: '/job-info', method: 'GET' }] } },
            BASE_URL,
          ),
        );
        spyOn(Bun, 'sleep').mockResolvedValue(undefined);
      });

      test('starts a job and prints its final record', async () => {
        const finished = { id: 'j1', status: 'Finished', progress: 100, data: { synced: 2 } };
        responses({ jobId: 'j1' }, { status: 'inProgress', progress: 40 }, finished);

        await start();

        expect(appService.callApi.mock.calls.map(([, request]) => request)).toEqual([
          expect.objectContaining({ method: 'POST', path: 'crowdin-update' }),
          jobInfo,
          jobInfo,
        ]);
        expect(Bun.sleep).toHaveBeenCalledTimes(1);
        expect(JSON.parse(printed())).toEqual(finished);
      });

      test('reports progress while the job runs, and its end once', async () => {
        responses(
          { jobId: 'j1' },
          { status: 'inProgress', progress: 40 },
          { status: 'inProgress', progress: 40 },
          { status: 'inProgress', progress: 70 },
          { status: 'finished', progress: 100 },
        );

        await createAppCommand().apiAction(
          createCommandContext(withOutput('text', { wait: true, method: 'POST', typedField: ['projectId=12'] }), [
            'z',
            'crowdin-update',
          ]),
        );

        const lines = printed().split('\n');
        expect(lines.filter((line) => line.includes(' j1'))).toEqual([
          expect.stringContaining('Waiting for job j1'),
          expect.stringContaining('Job j1: inProgress, 40%'),
          expect.stringContaining('Job j1: inProgress, 70%'),
          expect.stringContaining('Job j1 finished'),
        ]);
      });

      test('quotes a jobId from the response in the resume hint', async () => {
        responses({ jobId: "it's; rm" });
        appService.callApi.mockRejectedValueOnce(new CliError('offline'));

        expect(start()).rejects.toThrow(
          new CliError(
            "offline. The job may still be running. Resume with: crowdin app api z job-info -F projectId=12 -f 'jobId=it'\\''s; rm' --wait",
          ),
        );
      });

      test('prints a failed job before failing with its info', async () => {
        responses({ jobId: 'j1' }, { status: 'failed', info: 'Token expired', data: { synced: 1 } });

        expect(start()).rejects.toMatchObject({
          message: "Job 'j1' failed: Token expired",
          exitCode: ExitCode.GENERIC,
        });
        expect(JSON.parse(printed())).toMatchObject({ status: 'failed', data: { synced: 1 } });
      });

      test('fails on a canceled job', async () => {
        responses({ jobId: 'j1' }, { status: 'canceled', info: null });

        expect(start()).rejects.toThrow(new CliError("Job 'j1' was canceled"));
      });

      test('fails on a record without a status', async () => {
        responses({ jobId: 'j1' }, {});

        expect(start()).rejects.toThrow(new CliError("job-info returned no job status for job 'j1'"));
      });

      test('rejects an app without GET job-info before sending', async () => {
        appService.listMethods.mockResolvedValue(parseApiMethods(zendeskManifest, BASE_URL));

        expect(start()).rejects.toThrow(new CliError("Application 'z' declares no GET job-info; --wait needs it"));
        expect(appService.callApi).not.toHaveBeenCalled();
      });

      test('warns and succeeds when the response has no jobId', async () => {
        const stderr = spyOn(process.stderr, 'write').mockImplementation(() => true);
        responses({ synced: true });

        await start();

        expect(JSON.parse(printed())).toEqual({ synced: true });
        expect(stderr).toHaveBeenCalledWith(
          `${JSON.stringify({ level: 'warning', message: 'Response has no jobId; nothing to wait for' })}\n`,
        );
        expect(appService.callApi).toHaveBeenCalledTimes(1);
      });

      test('takes projectId from the --input body', async () => {
        responses({ jobId: 'j1' }, { status: 'finished' });

        await wait({ input: inputFile('{"projectId":"12","files":[]}') }, ['z', 'integration-update']);

        expect(appService.callApi).toHaveBeenLastCalledWith('z', jobInfo);
      });

      test('prefers the query projectId over the body', async () => {
        responses({ jobId: 'j1' }, { status: 'finished' });

        await wait({ input: inputFile('{"projectId":99}') }, ['z', 'crowdin-update?projectId=12']);

        expect(appService.callApi).toHaveBeenLastCalledWith('z', jobInfo);
      });

      test.each([[[]], [['projectId=abc']], [['projectId=0']]])('rejects the fields %p', async (typedField) => {
        expect(start({ typedField })).rejects.toMatchObject({
          message: '--wait needs a positive integer projectId in the request body or query',
          exitCode: ExitCode.VALIDATION,
        });
        expect(appService.listMethods).not.toHaveBeenCalled();
        expect(appService.callApi).not.toHaveBeenCalled();
      });

      test('resumes from the job-info response without a manifest check', async () => {
        responses({ status: 'inProgress', progress: 5 }, { status: 'finished', progress: 100 });

        await resume();

        expect(appService.listMethods).not.toHaveBeenCalled();
        expect(appService.callApi).toHaveBeenCalledTimes(2);
        expect(appService.callApi).toHaveBeenLastCalledWith('z', jobInfo);
        expect(JSON.parse(printed())).toEqual({ status: 'finished', progress: 100 });
      });

      test('does not poll a job that already ended', async () => {
        responses({ status: 'finished' });

        await resume();

        expect(appService.callApi).toHaveBeenCalledTimes(1);
        expect(Bun.sleep).not.toHaveBeenCalled();
      });

      test('requires a jobId to resume', async () => {
        expect(resume(['projectId=12'])).rejects.toMatchObject({
          message: '--wait on job-info needs a jobId',
          exitCode: ExitCode.VALIDATION,
        });
        expect(appService.callApi).not.toHaveBeenCalled();
      });

      test('gives up after 1 h without progress, and keeps waiting while it moves', async () => {
        const minute = 60_000;
        // Progress at 50 min; still waiting at 100 min (over 1 h in total); 70 min idle at 120 min.
        const clock = [0, 0, 50 * minute, 100 * minute, 120 * minute];
        spyOn(Date, 'now').mockImplementation(() => clock.shift() ?? 120 * minute);
        responses(
          { status: 'inProgress', progress: 10 },
          { status: 'inProgress', progress: 20 },
          { status: 'inProgress', progress: 20 },
        );

        expect(resume()).rejects.toThrow(
          new CliError(
            "Job 'j1' has not progressed for 1 h (still inProgress, 20%). " +
              "Resume with: crowdin app api z job-info -F projectId=12 -f 'jobId=j1' --wait",
          ),
        );
        expect(appService.callApi).toHaveBeenCalledTimes(3);
        expect(JSON.parse(printed())).toEqual({ status: 'inProgress', progress: 20 });
      });

      test('keeps the exit code of a failed poll and adds a resume hint', async () => {
        responses({ jobId: 'j1' });
        appService.callApi.mockRejectedValueOnce(new NotFoundError("'z' returned 404: Job not found"));

        expect(start()).rejects.toMatchObject({
          message:
            "'z' returned 404: Job not found. The job may still be running. " +
            "Resume with: crowdin app api z job-info -F projectId=12 -f 'jobId=j1' --wait",
          exitCode: ExitCode.NOT_FOUND,
        });
      });

      test('sends nothing on --dryrun', async () => {
        await start({ dryrun: true, typedField: [] });

        expect(appService.listMethods).not.toHaveBeenCalled();
        expect(appService.callApi).not.toHaveBeenCalled();
      });
    });
  });

  test.each([['methodsAction'], ['apiAction'], ['installAction'], ['uninstallAction']] as const)(
    '%s rejects an empty identifier',
    async (action) => {
      expect(createAppCommand()[action](createCommandContext(globalOptions, ['', 'settings']))).rejects.toThrow(
        new CliError('Application identifier can not be empty'),
      );
      expect(appService.listMethods).not.toHaveBeenCalled();
      expect(appService.callApi).not.toHaveBeenCalled();
    },
  );

  test.each([['../projects'], ['a/b'], ['x?y'], ['..'], ['..\t'], ['app#'], ['app%2f..'], ['app ']])(
    'rejects the identifier %p',
    async (app) => {
      const error = new ValidationError(
        `Invalid application identifier '${app}'. Use letters, digits, underscores and dashes`,
      );

      expect(createAppCommand().apiAction(createCommandContext(globalOptions, [app, 'settings']))).rejects.toThrow(
        error,
      );
      expect(createAppCommand().uninstallAction(createCommandContext(globalOptions, [app]))).rejects.toThrow(error);
    },
  );

  describe('parsing', () => {
    test('collects repeated -f and -F and a case-insensitive -X', async () => {
      await run([
        'api',
        'zendesk-guide',
        'crowdin-update',
        '-X',
        'post',
        '-F',
        'projectId=12',
        '-f',
        'entryIds[]=a',
        '--field',
        'entryIds[]=b',
        '--output',
        'json',
      ]);

      expect(appService.callApi).toHaveBeenCalledWith('zendesk-guide', {
        method: 'POST',
        path: 'crowdin-update',
        query: '',
        body: { entryIds: ['a', 'b'], projectId: 12 },
      });
    });

    test('takes several values after one flag', async () => {
      await run(['api', 'z', 'settings', '-F', 'projectId=12', 'jobId=7']);

      expect(appService.callApi).toHaveBeenCalledWith(
        'z',
        expect.objectContaining({ path: 'settings', query: 'projectId=12&jobId=7' }),
      );
    });

    test('takes an optional path on methods', async () => {
      await run(['methods', 'zendesk-guide']);
      expect(JSON.parse(printed())).toHaveLength(3);

      (console.log as unknown as ReturnType<typeof mock>).mockClear();
      await run(['methods', 'zendesk-guide', 'settings', '-X', 'post']);
      expect(JSON.parse(printed())).toMatchObject({ method: 'POST', path: 'settings' });
    });
  });
});
