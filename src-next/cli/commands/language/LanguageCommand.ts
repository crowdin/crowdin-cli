import type { LanguagesModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { projectConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetLanguageService, GetOutput, GetProjectService } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { colors } from '@/cli/utils/colors.ts';
import { resolveOutputFormat, type View } from '@/cli/utils/output.ts';
import { all, code } from './options.ts';

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

// `code` is resolved from --code plus the project's language mapping, so it rides along with the
// language: json consumers have no way to reproduce the mapping overrides on their own.
type ResolvedLanguage = LanguagesModel.Language & { code: string };

// Java message.language.list: resolved code, name.
const languageView: View<ResolvedLanguage> = {
  text: (language) => `${colors.yellow(language.code)} ${colors.green(language.name ?? '')}`,
  plain: (language) => language.code,
  keys: ['code', 'name'],
};

export default class LanguageCommand {
  constructor(
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getLanguageService: GetLanguageService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'language',
      description: 'Manage languages',
      subcommands: [
        {
          name: 'list',
          description: 'List target languages in the current project',
          options: [code, all, projectConfigGroup],
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
    const languageService = await this.getLanguageService(command);
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

      if (resolveOutputFormat(options.output) === 'text') {
        output.warning(message);
        return;
      }

      throw new CliError(message);
    }

    const languages = options.all
      ? await languageService.listSupportedLanguages()
      : (projectData.targetLanguages ?? []);

    output.list(
      languages.map((language) => ({
        ...language,
        code: this.getCode(projectData.languageMapping, language, codeFormat),
      })),
      languageView,
      { empty: 'No languages found' },
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
