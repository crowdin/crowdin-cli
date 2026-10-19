import type { AiModel, Client } from '@crowdin/crowdin-api-client';
import { toCliError } from '../errors/toCliError.ts';

export class AiService {
  constructor(private apiClient: Client) {}

  async listPrompts(options: AiModel.ListAiPromptsOptions = {}): Promise<AiModel.AiPromptResponse[]> {
    try {
      const aiApi = this.apiClient.aiApi.withFetchAll();
      const response = this.apiClient.organization
        ? await aiApi.listAiOrganizationPrompts(options)
        : await aiApi.listAiUserPrompts(await this.userId(), options);

      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, 'Failed to list AI prompts');
    }
  }

  // crowdin.com keeps prompts per user, so the listing needs the token owner's id.
  private async userId(): Promise<number> {
    const response = await this.apiClient.usersApi.getAuthenticatedUser();
    return response.data.id;
  }
}
