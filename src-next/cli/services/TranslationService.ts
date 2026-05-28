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
