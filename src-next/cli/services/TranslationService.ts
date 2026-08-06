import type { Client, Status, TranslationsModel } from '@crowdin/crowdin-api-client';
import { pollUntilFinished } from '@/lib/api/pollStatus.ts';
import { toCliError } from '../errors/toCliError.ts';
import WrongLanguageError from '../errors/WrongLanguageError.ts';
import type { Output } from '../utils/output.ts';

// Reported once per poll, so each command can word its own progress line (Java words them
// differently per command: verbose-only for `upload translations`, always for `file upload`).
export type ImportProgress = (
  status: Status<
    TranslationsModel.ImportTranslationsStatusAttributes | TranslationsModel.ImportTranslationsStringsStatusAttributes
  >,
) => void;

export class TranslationService {
  constructor(
    private apiClient: Client,
    private output: Output,
    private projectId: number,
  ) {}

  async importProjectTranslation(
    storageId: number,
    fileId: number,
    languageIds: string[],
    filePath: string,
    autoApproveImported?: boolean,
    importEqSuggestions?: boolean,
    translateHidden?: boolean,
    onProgress?: ImportProgress,
  ) {
    return await this.importAndWait(
      { storageId, fileId, languageIds, autoApproveImported, importEqSuggestions, translateHidden },
      filePath,
      onProgress,
    );
  }

  async importProjectTranslationStringsBased(
    storageId: number,
    branchId: number,
    languageIds: string[],
    filePath: string,
    autoApproveImported?: boolean,
    importEqSuggestions?: boolean,
    translateHidden?: boolean,
    onProgress?: ImportProgress,
  ) {
    return await this.importAndWait(
      { storageId, branchId, languageIds, autoApproveImported, importEqSuggestions, translateHidden },
      filePath,
      onProgress,
    );
  }

  async importXliffTranslation(
    storageId: number,
    languageIds: string[],
    filePath: string,
    onProgress?: ImportProgress,
  ) {
    return await this.importAndWait({ storageId, languageIds }, filePath, onProgress);
  }

  // The import is queued server-side, so the request alone proves nothing: wait for the status to
  // finish before returning, the way Java's executeAsyncAction does. Keeping the wait here means a
  // caller cannot mistake "queued" for "done" — the bug that shipped when commands had to remember.
  private async importAndWait(
    request: TranslationsModel.ImportTranslationsRequest | TranslationsModel.ImportTranslationsStringsRequest,
    filePath: string,
    onProgress?: ImportProgress,
  ) {
    const failureMessage = `Failed to upload the translation file '${filePath}'. Please contact our support team for help`;
    let response: Awaited<ReturnType<Client['translationsApi']['importTranslations']>>;

    try {
      response = await this.apiClient.translationsApi.importTranslations(this.projectId, request);
    } catch (error) {
      if (WrongLanguageError.matches(error)) {
        throw new WrongLanguageError();
      }

      throw toCliError(error, failureMessage);
    }

    return await pollUntilFinished(
      response,
      ({ identifier }) => this.getImportTranslationsStatus(identifier),
      failureMessage,
      onProgress,
    );
  }

  private async getImportTranslationsStatus(importId: string) {
    try {
      return await this.apiClient.translationsApi.importTranslationsStatus(this.projectId, importId);
    } catch (error) {
      throw toCliError(error, 'Failed to get import translations status');
    }
  }

  async buildProjectFileTranslation(fileId: number, targetLanguageId: string): Promise<string> {
    try {
      const response = await this.apiClient.translationsApi.buildProjectFileTranslation(this.projectId, fileId, {
        targetLanguageId,
      });

      return response.data.url;
    } catch (error) {
      throw toCliError(error, `Failed to build file translation for language ${targetLanguageId}`);
    }
  }

  async getTranslationDownloadUrl(buildId: number): Promise<string> {
    try {
      const response = await this.apiClient.translationsApi.downloadTranslations(this.projectId, buildId);
      return response.data.url;
    } catch (error) {
      throw toCliError(error, 'Failed to download project translations');
    }
  }

  async getMtSupportedLanguageIds(engineId: number): Promise<string[]> {
    try {
      const response = await this.apiClient.machineTranslationApi.getMt(engineId);
      return response.data.supportedLanguageIds ?? [];
    } catch (error) {
      throw toCliError(error, 'Failed to fetch the specified MT engine');
    }
  }

  async preTranslate(
    request: TranslationsModel.PreTranslateRequest | TranslationsModel.PreTranslateStringsRequest,
    verbose: boolean,
  ) {
    this.output.spinner('preTranslate', 'start', 'Auto-translation is running...');

    try {
      const applied = await this.apiClient.translationsApi.applyPreTranslation(this.projectId, request);
      const { data: status } = await pollUntilFinished(
        applied,
        ({ identifier }) => this.apiClient.translationsApi.preTranslationStatus(this.projectId, identifier),
        'Failed to auto-translate the project. Please contact our support team for help',
        (current) =>
          this.output.spinner(
            'preTranslate',
            'message',
            verbose
              ? `Auto-translation is completed by (${Math.trunc(current.progress)}%) (${current.identifier})`
              : `Auto-translation is completed by (${Math.trunc(current.progress)}%)`,
          ),
      );

      this.output.spinner(
        'preTranslate',
        'stop',
        verbose ? `Auto-translation is finished (100%) (${status.identifier})` : 'Auto-translation is finished (100%)',
      );

      return status;
    } catch (error) {
      this.output.spinner(
        'preTranslate',
        'error',
        'Failed to auto-translate the project. Please contact our support team for help',
      );
      throw toCliError(error, 'Failed to auto-translate the project. Please contact our support team for help');
    }
  }

  async getPreTranslationReport(preTranslationId: string): Promise<TranslationsModel.PreTranslationReport> {
    try {
      const response = await this.apiClient.translationsApi.getPreTranslationReport(this.projectId, preTranslationId);
      return response.data;
    } catch (error) {
      throw toCliError(error, 'Failed to fetch the auto-translation report');
    }
  }

  async buildProjectTranslations(request?: TranslationsModel.BuildRequest | TranslationsModel.PseudoBuildRequest) {
    this.output.spinner('build', 'start', 'Building translations...');

    try {
      const build = await this.apiClient.translationsApi.buildProject(this.projectId, request);

      // Keyed by the build id rather than a status identifier, so the poll closure ignores its
      // argument. The message is a function because a failed build carries the server's reason.
      await pollUntilFinished(
        build,
        () => this.apiClient.translationsApi.checkBuildStatus(this.projectId, build.data.id),
        (current) =>
          current.error?.message ? `Translations build failed: ${current.error.message}` : 'Translations build failed',
      );

      this.output.spinner('build', 'stop', 'Translations built');

      return build;
    } catch (error) {
      this.output.spinner('build', 'error', 'Translations build failed');
      throw toCliError(error, 'Failed to build project translations');
    }
  }
}
