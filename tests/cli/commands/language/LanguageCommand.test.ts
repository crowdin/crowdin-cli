import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import LanguageCommand from '@/cli/commands/language/LanguageCommand.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { LanguageService } from '@/cli/services/LanguageService.ts';
import { ProjectService } from '@/cli/services/ProjectService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

type LanguageCommandTestOptions = GlobalOptions & {
  code?: 'id' | 'two_letters_code' | 'three_letters_code' | 'locale' | 'android_code' | 'osx_code' | 'osx_locale';
  all?: boolean;
};

const globalOptions: GlobalOptions = {
  verbose: false,
  config: '',
  colors: false,
  progress: false,
  format: 'json',
};

const createCommandContext = (options: LanguageCommandTestOptions, args: string[] = []) => {
  return {
    optsWithGlobals: () => options,
    args,
  } as unknown as Command;
};

describe('LanguageCommand', () => {
  let commandContext: Command;
  let apiClient: Client;
  let output: Output;
  let projectService: ProjectService;
  let languageService: LanguageService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    output = createOutput(globalOptions);
    projectService = new ProjectService(apiClient, output, 123);
    languageService = new LanguageService(apiClient);
    commandContext = createCommandContext(globalOptions);

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
  });

  const createLanguageCommand = () => {
    return new LanguageCommand(
      () => output,
      async () => projectService,
      async () => languageService,
    );
  };

  test('delegates default action to command help', async () => {
    const languageCommand = createLanguageCommand();
    const help = mock(() => {});
    const helpCommand = { help, optsWithGlobals: () => ({}) } as unknown as Command;

    await languageCommand.defaultAction(helpCommand);

    expect(help).toHaveBeenCalledTimes(1);
  });

  test('lists project target languages by id by default', async () => {
    const languageCommand = createLanguageCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: {
        managerAccess: true,
        targetLanguages: [
          { id: 'fr', name: 'French', twoLettersCode: 'fr' },
          { id: 'de', name: 'German', twoLettersCode: 'de' },
        ],
      },
    } as never);

    await languageCommand.listAction(commandContext);

    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify(
        [
          { code: 'fr', name: 'French' },
          { code: 'de', name: 'German' },
        ],
        null,
        2,
      ),
    );
  });

  test('lists all supported languages when --all is passed', async () => {
    const languageCommand = createLanguageCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      all: true,
      code: 'locale',
    });

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: {
        managerAccess: true,
      },
    } as never);
    const listSupportedLanguages = mock().mockResolvedValue({
      data: [
        {
          data: { id: 'uk', name: 'Ukrainian', locale: 'uk-UA' },
        },
      ],
    });
    const withFetchAll = spyOn(apiClient.languagesApi, 'withFetchAll').mockReturnValue({
      listSupportedLanguages,
    } as never);

    await languageCommand.listAction(commandContext);

    expect(withFetchAll).toHaveBeenCalledTimes(1);
    expect(listSupportedLanguages).toHaveBeenCalledTimes(1);
    expect(listSupportedLanguages).toHaveBeenCalledWith();
    expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ code: 'uk-UA', name: 'Ukrainian' }], null, 2));
  });

  test('uses project language mapping for selected code type', async () => {
    const languageCommand = createLanguageCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      code: 'locale',
    });

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: {
        managerAccess: true,
        languageMapping: {
          uk: {
            locale: 'uk_UA',
          },
        },
        targetLanguages: [{ id: 'uk', name: 'Ukrainian', locale: 'uk-UA' }],
      },
    } as never);

    await languageCommand.listAction(commandContext);

    expect(console.log).toHaveBeenCalledWith(JSON.stringify([{ code: 'uk_UA', name: 'Ukrainian' }], null, 2));
  });

  test('throws if user has no manager access in non-text mode', async () => {
    const languageCommand = createLanguageCommand();

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: {
        managerAccess: false,
      },
    } as never);

    expect(languageCommand.listAction(commandContext)).rejects.toThrow(
      new CliError('You must have manager or developer role in the project to perform this action'),
    );
  });

  test('prints warning if user has no manager access in text mode', async () => {
    const languageCommand = createLanguageCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      format: 'text',
    });
    const warning = spyOn(output, 'warning');

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: {
        managerAccess: false,
      },
    } as never);

    await languageCommand.listAction(commandContext);

    expect(warning).toHaveBeenCalledWith(
      'You must have manager or developer role in the project to perform this action',
    );
  });

  test('wraps supported languages API errors into CliError', async () => {
    const languageCommand = createLanguageCommand();
    commandContext = createCommandContext({
      ...globalOptions,
      all: true,
    });

    spyOn(projectService, 'loadProject').mockResolvedValue({
      data: {
        managerAccess: true,
      },
    } as never);
    spyOn(apiClient.languagesApi, 'withFetchAll').mockReturnValue({
      listSupportedLanguages: mock().mockRejectedValue(new Error('network failure')),
    } as never);

    expect(languageCommand.listAction(commandContext)).rejects.toThrow(
      new CliError('Failed to list supported languages. network failure'),
    );
  });
});
