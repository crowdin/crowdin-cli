import type { Client, LanguagesModel } from '@crowdin/crowdin-api-client';
import { buildApiUrl } from '@/lib/organization/credentials.ts';
import CliError from '../errors/CliError.ts';
import { toCliError } from '../errors/toCliError.ts';
import ValidationError from '../errors/ValidationError.ts';

const PAGE_SIZE = 500;

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

  /**
   * Crowdin serves the supported-language list without credentials — on crowdin.com and per
   * organization, whose list differs — but only when the Authorization header is absent entirely
   * (an empty or invalid bearer is a 401), so the API client, which always sends one, cannot make
   * this call. Static because a client, and therefore a token, is exactly what the caller lacks.
   */
  static async listPublicSupportedLanguages(baseUrl: string): Promise<LanguagesModel.Language[]> {
    const languages: LanguagesModel.Language[] = [];

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const response = await fetch(`${buildApiUrl(baseUrl)}/languages?limit=${PAGE_SIZE}&offset=${offset}`);

      // An organization may still gate the list; there is no token to retry with, so name the fix.
      if (response.status === 401 || response.status === 403) {
        throw new ValidationError("Required option 'api_token' is missing");
      }

      if (!response.ok) {
        throw new CliError(`Failed to list supported languages. ${response.status} ${response.statusText}`);
      }

      const page = (await response.json()) as { data: { data: LanguagesModel.Language }[] };

      languages.push(...page.data.map((entry) => entry.data));

      if (page.data.length < PAGE_SIZE) {
        return languages;
      }
    }
  }
}
