import type { Client, Status, TranslationsModel } from '@crowdin/crowdin-api-client';
import { pollUntilFinished } from '@/lib/api/pollStatus.ts';
import { toCliError } from '../errors/toCliError.ts';
import WrongLanguageError from '../errors/WrongLanguageError.ts';
import type { Output } from '../utils/output.ts';
import { withSpinner } from '../utils/withSpinner.ts';

// Reported once per poll, so each command can word its own progress line (verbose-only for
// `upload translations`, always for `file upload`).
export type ImportProgress = (
  status: Status<
    TranslationsModel.ImportTranslationsStatusAttributes | TranslationsModel.ImportTranslationsStringsStatusAttributes
  >,
) => void;

const PRE_TRANSLATE_FAILURE = 'Failed to auto-translate the project. Please contact our support team for help';

export type PreTranslationStatus = Status<TranslationsModel.PreTranslationStatusAttributes>;

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
  // finish before returning. Keeping the wait here means a caller cannot mistake "queued" for
  // "done".
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

  /**
   * The export filters are switched off whatever the project settings say: the caller named one
   * file, so it gets that file, untranslated and unapproved strings included. Left to the project,
   * 'skip untranslated files' answers 204 with no body and 'skip untranslated strings' exports an
   * empty file.
   */
  async buildProjectFileTranslation(fileId: number, targetLanguageId: string): Promise<string> {
    try {
      // biome-ignore format: one argument per line
      const response = await this.apiClient.translationsApi.buildProjectFileTranslation(
        this.projectId,
        fileId,
        {
          targetLanguageId,
          skipUntranslatedStrings: false,
          skipUntranslatedFiles: false,
          // Each API rejects the other's fields as unexpected.
          ...(this.apiClient.organization
            ? { exportWithMinApprovalsCount: 0, exportStringsThatPassedWorkflow: false }
            : { exportApprovedOnly: false }),
        },
      );

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

  async startPreTranslation(
    request: TranslationsModel.PreTranslateRequest | TranslationsModel.PreTranslateStringsRequest,
  ): Promise<PreTranslationStatus> {
    try {
      const response = await this.apiClient.translationsApi.applyPreTranslation(this.projectId, request);
      return response.data;
    } catch (error) {
      throw toCliError(error, PRE_TRANSLATE_FAILURE);
    }
  }

  async getPreTranslationStatus(preTranslationId: string): Promise<PreTranslationStatus> {
    try {
      const response = await this.apiClient.translationsApi.preTranslationStatus(this.projectId, preTranslationId);
      return response.data;
    } catch (error) {
      throw toCliError(error, `Failed to get the auto-translation '${preTranslationId}'`);
    }
  }

  async listPreTranslations(): Promise<PreTranslationStatus[]> {
    try {
      const response = await this.apiClient.translationsApi.withFetchAll().listPreTranslations(this.projectId);
      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, 'Failed to list auto-translations');
    }
  }

  async preTranslate(
    request: TranslationsModel.PreTranslateRequest | TranslationsModel.PreTranslateStringsRequest,
    verbose: boolean,
  ) {
    return await this.pollPreTranslation(() => this.startPreTranslation(request), verbose);
  }

  async waitForPreTranslation(preTranslationId: string, verbose: boolean) {
    return await this.pollPreTranslation(() => this.getPreTranslationStatus(preTranslationId), verbose);
  }

  private async pollPreTranslation(initial: () => Promise<PreTranslationStatus>, verbose: boolean) {
    return await withSpinner(
      this.output,
      'preTranslate',
      {
        start: 'Auto-translation is running...',
        stop: (status) =>
          verbose
            ? `Auto-translation is finished (100%) (${status.identifier})`
            : 'Auto-translation is finished (100%)',
        fail: PRE_TRANSLATE_FAILURE,
      },
      async () => {
        const { data: status } = await pollUntilFinished(
          { data: await initial() },
          ({ identifier }) => this.apiClient.translationsApi.preTranslationStatus(this.projectId, identifier),
          PRE_TRANSLATE_FAILURE,
          (current) =>
            this.output.spinner(
              'preTranslate',
              'message',
              verbose
                ? `Auto-translation is completed by (${Math.trunc(current.progress)}%) (${current.identifier})`
                : `Auto-translation is completed by (${Math.trunc(current.progress)}%)`,
            ),
        );

        return status;
      },
    );
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
    return await withSpinner(
      this.output,
      'build',
      { start: 'Building translations...', stop: 'Translations built', fail: 'Failed to build project translations' },
      async () => {
        const build = await this.apiClient.translationsApi.buildProject(this.projectId, request);

        // Keyed by the build id rather than a status identifier, so the poll closure ignores its
        // argument. The message is a function because a failed build carries the server's reason.
        await pollUntilFinished(
          build,
          () => this.apiClient.translationsApi.checkBuildStatus(this.projectId, build.data.id),
          (current) =>
            current.error?.message
              ? `Translations build failed: ${current.error.message}`
              : 'Translations build failed',
        );

        return build;
      },
    );
  }
}
