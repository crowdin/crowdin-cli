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

interface LanguageData {
  id: string;
  name?: string;
  locale?: string;
  twoLettersCode?: string;
  threeLettersCode?: string;
  androidCode?: string;
  osxCode?: string;
  osxLocale?: string;
}

interface ProjectData {
  targetLanguages?: LanguageData[];
  languageMapping?: Record<string, Record<string, string>>;
  managerAccess?: boolean;
}

type GetOutput = (command: Command) => Output;
type GetProjectService = (command: Command) => Promise<ProjectService>;

export default class LanguageCommand {
  constructor(
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getApiClient: GetApiClient,
  ) {
  }

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
    const selectedCode = options.code ?? 'id';
    const project = await projectService.loadProject();
    const projectData = project.data as ProjectData;

    // TODO: This options does not look right
    if (projectData.managerAccess === false) {
      const message = 'You must have manager or developer role in the project to perform this action';

      if (options.format === 'text') {
        output.warning(message);
        return;
      }

      throw new CliError(message);
    }

    let languages: LanguageData[];

    if (options.all) {
      try {
        const response = await apiClient.languagesApi.listSupportedLanguages({ offset: 500 });
        languages = response.data.map((entry) => entry.data as LanguageData);
      } catch (error) {
        throw toCliError(error, 'Failed to list supported languages');
      }
    } else {
      languages = projectData.targetLanguages ?? [];
    }

    output.table(
      languages.map((language) => ({
        code: this.getCode(projectData.languageMapping, language, selectedCode),
        name: language.name ?? '',
      })),
    );
  };

  private getCode(
    languageMapping: ProjectData['languageMapping'],
    language: LanguageData,
    codeType: LanguageCodeFormat,
  ): string {
    const mappedCode = languageMapping?.[language.id]?.[codeType];

    if (mappedCode) {
      return mappedCode;
    }

    switch (codeType) {
      case 'two_letters_code':
        return language.twoLettersCode ?? language.id;
      case 'three_letters_code':
        return language.threeLettersCode ?? language.id;
      case 'locale':
        return language.locale ?? language.id;
      case 'android_code':
        return language.androidCode ?? language.id;
      case 'osx_code':
        return language.osxCode ?? language.id;
      case 'osx_locale':
        return language.osxLocale ?? language.id;
      case 'id':
      default:
        return language.id;
    }
  }
}
