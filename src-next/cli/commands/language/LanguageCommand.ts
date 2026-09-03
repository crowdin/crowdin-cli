import type { LanguagesModel, ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { reportNoManagerAccess } from '@/cli/commands/common/managerAccess.ts';
import { projectConfigGroup } from '@/cli/commands/common/options.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import { LanguageService } from '@/cli/services/LanguageService.ts';
import type { GetConfig, GetLanguageService, GetOutput, GetProjectService } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { colors } from '@/cli/utils/colors.ts';
import type { Output, View } from '@/cli/utils/output.ts';
import { hasManagerAccess } from '@/lib/project/access.ts';
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
    private tryGetConfig: GetConfig,
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
    const codeFormat = options.code ?? 'id';
    const config = await this.tryGetConfig(command);

    // Supported languages are project-independent, and with no project there is no language mapping
    // to apply — so `--all` needs no project_id: a token alone answers it, and so do no credentials
    // at all, since the list is public (per organization, whose list differs) at every base_url.
    if (options.all && (!config.apiToken || !config.projectId)) {
      if (config.apiToken) {
        const languageService = await this.getLanguageService(command);

        this.printLanguages(output, await languageService.listSupportedLanguages(), undefined, codeFormat);
        return;
      }

      this.printLanguages(
        output,
        await LanguageService.listPublicSupportedLanguages(config.baseUrl),
        undefined,
        codeFormat,
      );
      return;
    }

    const projectService = await this.getProjectService(command);
    const languageService = await this.getLanguageService(command);
    const project = await projectService.loadProject();

    // Manager/developer role is exposed as `languageMapping` only on the settings-bearing response.
    if (!hasManagerAccess(project)) {
      reportNoManagerAccess(output, options.output);
      return;
    }

    const languages = options.all
      ? await languageService.listSupportedLanguages()
      : (project.data.targetLanguages ?? []);

    this.printLanguages(output, languages, project.data.languageMapping, codeFormat);
  };

  private printLanguages(
    output: Output,
    languages: LanguagesModel.Language[],
    languageMapping: ProjectsGroupsModel.LanguageMapping | undefined,
    codeFormat: LanguageCodeFormat,
  ): void {
    output.list(
      languages.map((language) => ({
        ...language,
        code: this.getCode(languageMapping, language, codeFormat),
      })),
      languageView,
      { empty: 'No languages found' },
    );
  }

  private getCode(
    languageMapping: ProjectsGroupsModel.LanguageMapping | undefined,
    language: LanguagesModel.Language,
    codeFormat: LanguageCodeFormat,
  ): string {
    // The client types the mapping entity with fixed keys; `id` is not one of them.
    const mappedCode = (languageMapping?.[language.id] as Record<string, string> | undefined)?.[codeFormat];

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
