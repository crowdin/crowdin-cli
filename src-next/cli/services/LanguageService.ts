import type { Client, LanguagesModel } from '@crowdin/crowdin-api-client';
import { toCliError } from '../errors/CliError.ts';

export class LanguageService {
  constructor(private apiClient: Client) {}

  async listSupportedLanguages(): Promise<LanguagesModel.Language[]> {
    try {
      const response = await this.apiClient.languagesApi.withFetchAll().listSupportedLanguages();
      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, 'Failed to list supported languages');
    }
  }
}
