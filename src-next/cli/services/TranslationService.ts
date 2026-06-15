import type { Client, TranslationsModel } from '@crowdin/crowdin-api-client';
import CliError, { toCliError } from '../errors/CliError.ts';
import type { Output } from '../utils/output.ts';

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
  ) {
    try {
      await this.apiClient.translationsApi.importTranslations(this.projectId, {
        storageId,
        fileId,
        languageIds,
        autoApproveImported,
        importEqSuggestions,
        translateHidden,
      });
    } catch (error) {
      throw toCliError(error, `Failed to import translations for file ${filePath}`);
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
    this.output.spinner('preTranslate', 'start', 'Pre-translation is running...');

    try {
      const applied = await this.apiClient.translationsApi.applyPreTranslation(this.projectId, request);
      let status = applied.data;

      while (status.status.toLowerCase() !== 'finished') {
        if (status.status.toLowerCase() === 'failed') {
          throw new CliError('Failed to pre-translate the project. Please contact our support team for help');
        }

        const progress = Math.trunc(status.progress);
        this.output.spinner(
          'preTranslate',
          'message',
          verbose
            ? `Pre-translation is completed by (${progress}%) (${status.identifier})`
            : `Pre-translation is completed by (${progress}%)`,
        );

        await Bun.sleep(1000);

        status = (await this.apiClient.translationsApi.preTranslationStatus(this.projectId, status.identifier)).data;
      }

      this.output.spinner(
        'preTranslate',
        'stop',
        verbose ? `Pre-translation is finished (100%) (${status.identifier})` : 'Pre-translation is finished (100%)',
      );

      return status;
    } catch (error) {
      this.output.spinner(
        'preTranslate',
        'error',
        'Failed to pre-translate the project. Please contact our support team for help',
      );
      throw toCliError(error, 'Failed to pre-translate the project. Please contact our support team for help');
    }
  }

  async getPreTranslationReport(preTranslationId: string): Promise<TranslationsModel.PreTranslationReport> {
    try {
      const response = await this.apiClient.translationsApi.getPreTranslationReport(this.projectId, preTranslationId);
      return response.data;
    } catch (error) {
      throw toCliError(error, 'Failed to fetch the pre-translation report');
    }
  }

  async buildProjectTranslations(request?: TranslationsModel.BuildRequest | TranslationsModel.PseudoBuildRequest) {
    this.output.spinner('build', 'start', 'Building translations...');

    try {
      const build = await this.apiClient.translationsApi.buildProject(this.projectId, request);

      while (true) {
        const buildProgress = await this.apiClient.translationsApi.checkBuildStatus(this.projectId, build.data.id);

        if (buildProgress.data.status === 'finished') {
          break;
        }

        if (buildProgress.data.status === 'failed') {
          throw new CliError('Translations build failed');
        }

        await Bun.sleep(2000);
      }

      this.output.spinner('build', 'stop', 'Translations built');

      return build;
    } catch (error) {
      this.output.spinner('build', 'error', 'Translations build failed');
      throw toCliError(error, 'Failed to build project translations');
    }
  }
}
