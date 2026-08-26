import type { Client, TranslationMemoryModel } from '@crowdin/crowdin-api-client';
import { pollUntilFinished } from '@/lib/api/pollStatus.ts';
import { toCliError } from '../errors/toCliError.ts';
import type { Output } from '../utils/output.ts';
import { withSpinner } from '../utils/withSpinner.ts';

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

    return await withSpinner(
      this.output,
      'tmExport',
      {
        start: 'Building translation memory',
        stop: 'Building translation memory (100%)',
        fail: 'Failed to build the translation memory',
      },
      async () => {
        const started = await this.apiClient.translationMemoryApi.exportTm(tmId, request);
        const finished = await pollUntilFinished(
          started,
          ({ identifier }) => this.apiClient.translationMemoryApi.checkExportStatus(tmId, identifier),
          'The build has failed',
          (status) => this.output.spinner('tmExport', 'message', `Building translation memory (${status.progress}%)`),
        );

        return finished.data.identifier;
      },
    );
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
