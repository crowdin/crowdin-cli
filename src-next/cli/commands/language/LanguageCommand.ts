import type { LanguagesModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import CliError, { toCliError } from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetApiClient, GetOutput, GetProjectService } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import all from './options/all.ts';
import code from './options/code.ts';

type LanguageCodeFormat =
  | 'id'
  | 'two_letters_code'
  | 'three_letters_code'
  | 'locale'
  | 'android_code'
  | 'osx_code'
  | 'osx_locale';

interface LanguageCommandOptions extends GlobalOptions {
  code?: LanguageCodeFormat;
  all?: boolean;
}

type LanguageMapping = Record<string, Record<string, string>>;

export default class LanguageCommand {
  constructor(
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getApiClient: GetApiClient,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'language',
      description: 'Manage languages',
      subcommands: [
        {
          name: 'list',
          description: 'List target languages in the current project',
          options: [code, all],
          action: this.listAction,
        },
      ],
      action: this.defaultAction,
    };
  }

  defaultAction = async (command: Command) => {
    command.help();
  };

  listAction = async (command: Command) => {
    const options = command.optsWithGlobals() as LanguageCommandOptions;
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const apiClient = await this.getApiClient(command);
    const codeFormat = options.code ?? 'id';
    const project = await projectService.loadProject();
    const projectData = project.data as {
      targetLanguages?: LanguagesModel.Language[];
      languageMapping?: LanguageMapping;
      managerAccess?: boolean;
    };

    // TODO: This options does not look right
    if (projectData.managerAccess === false) {
      const message = 'You must have manager or developer role in the project to perform this action';

      if (options.format === 'text') {
        output.warning(message);
        return;
      }

      throw new CliError(message);
    }

    let languages: LanguagesModel.Language[];

    if (options.all) {
      try {
        const response = await apiClient.languagesApi.listSupportedLanguages({ offset: 500 });
        languages = response.data.map((entry) => entry.data);
      } catch (error) {
        throw toCliError(error, 'Failed to list supported languages');
      }
    } else {
      languages = projectData.targetLanguages ?? [];
    }

    output.table(
      languages.map((language) => ({
        code: this.getCode(projectData.languageMapping, language, codeFormat),
        name: language.name ?? '',
      })),
    );
  };

  private getCode(
    languageMapping: LanguageMapping | undefined,
    language: LanguagesModel.Language,
    codeFormat: LanguageCodeFormat,
  ): string {
    const mappedCode = languageMapping?.[language.id]?.[codeFormat];

    if (mappedCode) {
      return mappedCode;
    }

    const codes: Record<LanguageCodeFormat, string | undefined> = {
      id: language.id,
      two_letters_code: language.twoLettersCode,
      three_letters_code: language.threeLettersCode,
      locale: language.locale,
      android_code: language.androidCode,
      osx_code: language.osxCode,
      osx_locale: language.osxLocale,
    };

    return codes[codeFormat] ?? language.id;
  }
}
