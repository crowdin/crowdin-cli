import type { ProjectsGroupsModel, ResponseObject, TranslationsModel } from '@crowdin/crowdin-api-client';
import { ProjectsGroupsModel as ProjectsGroups } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { branch, filesConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type {
  GetBranchService,
  GetFileService,
  GetLabelService,
  GetOutput,
  GetProjectService,
  GetTranslationService,
} from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { normalizePath } from '@/cli/utils/parsing.ts';
import { stripBranchPrefix } from '@/lib/utils/path.ts';
import {
  aiPrompt,
  autoApproveOption,
  directory,
  duplicateTranslations,
  engineId,
  excludeLabel,
  excludeLanguage,
  file,
  label,
  language,
  method,
  noDuplicateTranslations,
  noTranslateWithPerfectMatchOnly,
  priority,
  replaceTranslationsOption,
  resetApprovalStatus,
  scope,
  skipApprovedTranslations,
  sourceLanguage,
  translateWithPerfectMatchOnly,
  translationModifiedBefore,
} from './options.ts';

type Method = TranslationsModel.Method;
type AutoApproveOption = TranslationsModel.AutoApproveOption;
type ReplaceTranslationsOption = TranslationsModel.ReplaceTranslationsOption;

interface AutoTranslateCommandOptions extends GlobalOptions {
  language?: string[];
  excludeLanguage?: string[];
  file?: string[];
  method?: string;
  engineId?: number;
  branch?: string;
  directory?: string;
  autoApproveOption?: string;
  duplicateTranslations?: boolean;
  skipApprovedTranslations?: boolean;
  scope?: string;
  priority?: string;
  translationModifiedBefore?: string;
  replaceTranslationsOption?: string;
  resetApprovalStatus?: boolean;
  translateWithPerfectMatchOnly?: boolean;
  label?: string[];
  excludeLabel?: string[];
  sourceLanguage?: string;
  aiPrompt?: number;
}

const SUPPORTED_METHODS: Method[] = ['tm', 'mt', 'ai'];

const AUTO_APPROVE_OPTIONS: Record<string, AutoApproveOption> = {
  all: 'all',
  'except-auto-substituted': 'exceptAutoSubstituted',
  'perfect-match-only': 'perfectMatchOnly',
  none: 'none',
};

const REPLACE_TRANSLATIONS_OPTIONS: Record<string, ReplaceTranslationsOption> = {
  none: 'none',
  'auto-translated': 'autoTranslated',
  all: 'all',
};

export default class AutoTranslateCommand {
  constructor(
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getBranchService: GetBranchService,
    private getFileService: GetFileService,
    private getLabelService: GetLabelService,
    private getTranslationService: GetTranslationService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'auto-translate',
      description: 'Auto-translate files via Machine Translation (MT), Translation Memory (TM), or AI',
      action: this.defaultAction,
      options: [
        language,
        excludeLanguage,
        file,
        method,
        engineId,
        branch,
        directory,
        autoApproveOption,
        duplicateTranslations,
        noDuplicateTranslations,
        skipApprovedTranslations,
        scope,
        priority,
        translationModifiedBefore,
        replaceTranslationsOption,
        resetApprovalStatus,
        translateWithPerfectMatchOnly,
        noTranslateWithPerfectMatchOnly,
        label,
        excludeLabel,
        sourceLanguage,
        aiPrompt,
        filesConfigGroup,
      ],
    };
  }

  defaultAction = async (command: Command) => {
    const options = command.optsWithGlobals() as AutoTranslateCommandOptions;
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const branchService = await this.getBranchService(command);
    const fileService = await this.getFileService(command);
    const labelService = await this.getLabelService(command);
    const translationService = await this.getTranslationService(command);

    const verbose = Boolean(options.verbose);
    const translateMethod = this.resolveMethod(options.method);
    const engineIdValue = this.toNumber(options.engineId);
    const aiPromptId = this.toNumber(options.aiPrompt);
    const files = (options.file ?? []).map((value) => normalizePath(value));
    const directoryPath = options.directory ? normalizePath(options.directory) : undefined;
    const languageIds = options.language;
    const excludeLanguageIds = options.excludeLanguage;
    const { duplicateTranslations: duplicate, skipApprovedTranslations, resetApprovalStatus } = options;
    const perfectMatchOnly = options.translateWithPerfectMatchOnly;
    const scope = options.scope as TranslationsModel.Scope | undefined;
    const priority = options.priority as TranslationsModel.Priority | undefined;
    const { translationModifiedBefore, sourceLanguage: sourceLanguageId } = options;
    const replaceTranslations = this.resolveReplaceTranslationsOption(options.replaceTranslationsOption);

    // Validation order mirrors the Java `checkOptions` method.
    if (directoryPath && files.length > 0) {
      throw new CliError("Either '--file' or '--directory' can be specified");
    }

    if (excludeLanguageIds && languageIds && !this.isAllLanguages(languageIds)) {
      throw new CliError("The '--language' and '--exclude-language' options can't be used simultaneously");
    }

    if (translateMethod === 'mt' && engineIdValue === undefined) {
      throw new CliError("Machine Translation should be used with the '--engine-id' parameter");
    }

    if (translateMethod !== 'tm' && perfectMatchOnly !== undefined) {
      throw new CliError("'--translate-with-perfect-match-only' only works with the TM auto-translation method");
    }

    const autoApprove = this.resolveAutoApproveOption(options.autoApproveOption, translateMethod, output);

    if (translateMethod === 'ai' && aiPromptId === undefined) {
      throw new CliError("AI should be used with the '--ai-prompt' parameter");
    }

    const project = await projectService.loadProject();
    const isStringsBasedProject = project.data.type === ProjectsGroups.Type.STRINGS_BASED;

    const languages = await this.prepareLanguageIds(
      project,
      languageIds,
      excludeLanguageIds,
      translateMethod,
      engineIdValue,
      translationService,
      output,
    );
    const labelIds = await this.prepareLabelIds(options.label, labelService, output);
    const excludeLabelIds = await this.prepareLabelIds(options.excludeLabel, labelService, output);

    const branchName = this.normalizeBranch(options.branch);

    if (isStringsBasedProject) {
      if (files.length > 0 || directoryPath) {
        throw new CliError('File management is not available for string-based projects');
      }

      const projectBranch = branchName ? await branchService.getBranch(branchName) : undefined;

      if (!projectBranch) {
        throw new CliError('Branch is required for string-based projects');
      }

      const request: TranslationsModel.PreTranslateStringsRequest = {
        languageIds: languages,
        branchIds: [projectBranch.id],
        method: translateMethod,
        engineId: engineIdValue,
        autoApproveOption: autoApprove,
        duplicateTranslations: duplicate,
        skipApprovedTranslations,
        scope,
        priority,
        translationModifiedBefore,
        replaceTranslationsOption: replaceTranslations,
        resetApprovalStatus,
        translateWithPerfectMatchOnly: perfectMatchOnly,
        labelIds,
        excludeLabelIds,
        sourceLanguageId,
        aiPromptId,
      };

      const status = await translationService.preTranslate(request, verbose);
      await this.printVerbose(translationService, status, output, verbose);
      return;
    }

    let branchId: number | undefined;

    if (branchName) {
      const projectBranch = await branchService.getBranch(branchName);

      if (!projectBranch) {
        throw new CliError(`Branch '${branchName}' doesn't exist in the project`);
      }

      branchId = projectBranch.id;
    }

    const projectFiles = await fileService.loadProjectFiles(branchId);
    const paths = new Map<string, number>();

    for (const entry of projectFiles.data) {
      const isInScope = branchId === undefined ? entry.data.branchId == null : entry.data.branchId === branchId;

      if (isInScope) {
        // Server paths carry the branch name; the paths passed via --file never do.
        paths.set(stripBranchPrefix(normalizePath(entry.data.path), branchName), entry.data.id);
      }
    }

    const fileIds: number[] = [];
    let containsError = false;

    if (files.length > 0) {
      for (const filePath of files) {
        const fileId = paths.get(filePath);

        if (fileId === undefined) {
          const message = `Project doesn't contain the '${filePath}' file`;

          if (files.length > 1) {
            containsError = true;
            output.warning(message);
            continue;
          }

          throw new CliError(message);
        }

        fileIds.push(fileId);
      }
    } else if (directoryPath) {
      for (const [path, fileId] of paths) {
        if (path.startsWith(directoryPath)) {
          fileIds.push(fileId);
        }
      }
    } else {
      fileIds.push(...paths.values());
    }

    if (fileIds.length === 0) {
      throw new CliError("Couldn't find any files to Auto-Translate in the current project");
    }

    const request: TranslationsModel.PreTranslateRequest = {
      languageIds: languages,
      fileIds,
      method: translateMethod,
      engineId: engineIdValue,
      autoApproveOption: autoApprove,
      duplicateTranslations: duplicate,
      skipApprovedTranslations,
      scope,
      priority,
      translationModifiedBefore,
      replaceTranslationsOption: replaceTranslations,
      resetApprovalStatus,
      translateWithPerfectMatchOnly: perfectMatchOnly,
      labelIds,
      excludeLabelIds,
      sourceLanguageId,
      aiPromptId,
    };

    const status = await translationService.preTranslate(request, verbose);
    await this.printVerbose(translationService, status, output, verbose);

    if (containsError) {
      throw new CliError('Some of the specified files were not found in the project');
    }
  };

  private resolveMethod(value?: string): Method {
    if (!value) {
      throw new CliError("Missing required option '--method'. Supported values: mt, tm, ai");
    }

    const normalized = value.toLowerCase() as Method;

    if (!SUPPORTED_METHODS.includes(normalized)) {
      throw new CliError(`Invalid value for '--method'. Supported values: mt, tm, ai`);
    }

    return normalized;
  }

  private resolveAutoApproveOption(
    value: string | undefined,
    translateMethod: Method,
    output: ReturnType<GetOutput>,
  ): AutoApproveOption | undefined {
    if (!value) {
      return undefined;
    }

    if (translateMethod === 'mt') {
      output.warning("'--auto-approve-option' is used only for the TM Auto-Translation method");
      return undefined;
    }

    const resolved = AUTO_APPROVE_OPTIONS[value];

    if (!resolved) {
      throw new CliError(
        "Wrong '--auto-approve-option' parameter. Supported values: all, except-auto-substituted, perfect-match-only, none",
      );
    }

    return resolved;
  }

  private resolveReplaceTranslationsOption(value: string | undefined): ReplaceTranslationsOption | undefined {
    if (!value) {
      return undefined;
    }

    const resolved = REPLACE_TRANSLATIONS_OPTIONS[value];

    if (!resolved) {
      throw new CliError(
        "Wrong '--replace-translations-option' parameter. Supported values: none, auto-translated, all",
      );
    }

    return resolved;
  }

  private async prepareLanguageIds(
    project: ResponseObject<ProjectsGroupsModel.Project>,
    languageIds: string[] | undefined,
    excludeLanguageIds: string[] | undefined,
    translateMethod: Method,
    engineIdValue: number | undefined,
    translationService: Awaited<ReturnType<GetTranslationService>>,
    output: ReturnType<GetOutput>,
  ): Promise<string[]> {
    const projectLanguages = project.data.targetLanguages.map((targetLanguage) => targetLanguage.id);
    const excludedLanguages = this.prepareExcludedLanguageIds(excludeLanguageIds, projectLanguages);

    if (!languageIds || this.isAllLanguages(languageIds)) {
      let languages = projectLanguages;

      if (translateMethod === 'mt' && engineIdValue !== undefined) {
        try {
          output.spinner('mtLanguages', 'start', 'Validating supported languages for the specified MT engine');
          const supportedLanguageIds = new Set(await translationService.getMtSupportedLanguageIds(engineIdValue));
          output.spinner('mtLanguages', 'stop', 'Validation was successful');
          languages = projectLanguages.filter((languageId) => supportedLanguageIds.has(languageId));
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          output.spinner('mtLanguages', 'error', `Validation error: ${reason}`);
        }
      }

      if (excludedLanguages.length > 0) {
        languages = languages.filter((languageId) => !excludedLanguages.includes(languageId));
      }

      return languages;
    }

    const wrongLanguageIds = languageIds
      .filter((languageId) => !projectLanguages.includes(languageId))
      .map((languageId) => `'${languageId}'`)
      .join(', ');

    if (wrongLanguageIds) {
      throw new CliError(
        `Language(s) ${wrongLanguageIds} doesn't exist in the project. Try specifying another language code(s)`,
      );
    }

    return languageIds;
  }

  private prepareExcludedLanguageIds(excludeLanguageIds: string[] | undefined, projectLanguages: string[]): string[] {
    if (!excludeLanguageIds || excludeLanguageIds.length === 0) {
      return [];
    }

    const wrongLanguageIds = excludeLanguageIds
      .filter((languageId) => !projectLanguages.includes(languageId))
      .map((languageId) => `'${languageId}'`)
      .join(', ');

    if (wrongLanguageIds) {
      throw new CliError(
        `Language(s) ${wrongLanguageIds} doesn't exist in the project. Try specifying another language code(s)`,
      );
    }

    return excludeLanguageIds;
  }

  private async prepareLabelIds(
    labelNames: string[] | undefined,
    labelService: Awaited<ReturnType<GetLabelService>>,
    output: ReturnType<GetOutput>,
  ): Promise<number[] | undefined> {
    if (!labelNames || labelNames.length === 0) {
      return undefined;
    }

    const labels = await labelService.list();
    const labelIdsByTitle = new Map(labels.map((entry) => [entry.title, entry.id]));

    for (const labelName of new Set(labelNames)) {
      if (!labelIdsByTitle.has(labelName)) {
        output.warning(`The '${labelName}' label is missing in the Crowdin project`);
      }
    }

    return labelNames
      .map((labelName) => labelIdsByTitle.get(labelName))
      .filter((labelId): labelId is number => labelId !== undefined);
  }

  private async printVerbose(
    translationService: Awaited<ReturnType<GetTranslationService>>,
    status: { identifier: string },
    output: ReturnType<GetOutput>,
    verbose: boolean,
  ): Promise<void> {
    if (!verbose) {
      return;
    }

    const report = await translationService.getPreTranslationReport(status.identifier);

    let filesCount = 0;
    let phrasesCount = 0;
    let wordsCount = 0;
    let skippedCount = 0;

    for (const targetLanguage of report.languages ?? []) {
      const targetFiles = targetLanguage.files ?? [];
      filesCount += targetFiles.length;

      for (const targetFile of targetFiles) {
        phrasesCount += targetFile.statistics?.phrases ?? 0;
        wordsCount += targetFile.statistics?.words ?? 0;
      }

      for (const skipped of Object.values(targetLanguage.skipped ?? {})) {
        skippedCount += Number(skipped) || 0;
      }
    }

    output.log(`\t- files: ${filesCount}`);
    output.log(`\t- phrases: ${phrasesCount}`);
    output.log(`\t- words: ${wordsCount}`);
    output.log(`\t- skipped: ${skippedCount}`);
  }

  private isAllLanguages(languages: string[]): boolean {
    return languages.length === 1 && languages[0]?.toLowerCase() === 'all';
  }

  private normalizeBranch(value?: string): string | undefined {
    if (!value || value === 'none') {
      return undefined;
    }

    return value;
  }

  private toNumber(value: number | string | undefined): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = Number(value);

    return Number.isNaN(parsed) ? undefined : parsed;
  }
}
