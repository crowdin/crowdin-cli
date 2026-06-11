import type { Client, TranslationMemoryModel } from '@crowdin/crowdin-api-client';
import CliError, { toCliError } from '../errors/CliError.ts';
import type { Output } from '../utils/output.ts';

export class TmService {
  constructor(
    private apiClient: Client,
    private output: Output,
  ) {}

  async list(): Promise<TranslationMemoryModel.TranslationMemory[]> {
    try {
      const response = await this.apiClient.translationMemoryApi.withFetchAll().listTm();
      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, 'Failed to list translation memories');
    }
  }

  async get(id: number): Promise<TranslationMemoryModel.TranslationMemory> {
    try {
      const response = await this.apiClient.translationMemoryApi.getTm(id);
      return response.data;
    } catch (error) {
      throw toCliError(error, `Failed to get translation memory #${id}`);
    }
  }

  async add(
    request: TranslationMemoryModel.AddTranslationMemoryRequest,
  ): Promise<TranslationMemoryModel.TranslationMemory> {
    try {
      const response = await this.apiClient.translationMemoryApi.addTm(request);
      return response.data;
    } catch (error) {
      throw toCliError(error, `Failed to add translation memory '${request.name}'`);
    }
  }

  async export(
    tmId: number,
    sourceLanguageId?: string,
    targetLanguageId?: string,
    format?: TranslationMemoryModel.Format,
  ): Promise<string> {
    // Language ids are strings (e.g. 'uk'); the client typing declaring them
    // as numbers in ExportTranslationMemoryRequest doesn't match the API
    const request = {
      ...(sourceLanguageId !== undefined ? { sourceLanguageId } : {}),
      ...(targetLanguageId !== undefined ? { targetLanguageId } : {}),
      ...(format !== undefined ? { format } : {}),
    } as TranslationMemoryModel.ExportTranslationMemoryRequest;

    this.output.spinner('tm-export', 'start', 'Building translation memory');

    try {
      let status = (await this.apiClient.translationMemoryApi.exportTm(tmId, request)).data;

      while (status.status !== 'finished') {
        if (status.status === 'failed') {
          throw new CliError('The build has failed');
        }

        this.output.spinner('tm-export', 'message', `Building translation memory (${status.progress}%)`);
        await Bun.sleep(1000);

        status = (await this.apiClient.translationMemoryApi.checkExportStatus(tmId, status.identifier)).data;
      }

      this.output.spinner('tm-export', 'stop', 'Building translation memory (100%)');

      return status.identifier;
    } catch (error) {
      this.output.spinner('tm-export', 'error', 'Failed to build the translation memory');
      throw toCliError(error, 'Failed to build the translation memory');
    }
  }

  async getDownloadUrl(tmId: number, exportId: string): Promise<string> {
    try {
      const response = await this.apiClient.translationMemoryApi.downloadTm(tmId, exportId);
      return response.data.url;
    } catch (error) {
      throw toCliError(error, 'Failed to download translation memory');
    }
  }

  async import(tmId: number, request: TranslationMemoryModel.ImportTranslationMemoryRequest): Promise<void> {
    try {
      await this.apiClient.translationMemoryApi.importTm(tmId, request);
    } catch (error) {
      throw toCliError(error, 'Failed to import translation memory');
    }
  }
}
