import type { ApplicationsModel, Client } from '@crowdin/crowdin-api-client';
import { toCliError } from '@/cli/errors/toCliError.ts';

interface AppStoreResponse {
  data?: Array<{
    manifest?: string;
  }>;
}

export class AppService {
  constructor(private client: Client) {}

  async list(): Promise<ApplicationsModel.Application[]> {
    try {
      const response = await this.client.applicationsApi.withFetchAll().listApplicationInstallations();

      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, 'Failed to list applications');
    }
  }

  async installByManifestUrl(url: string): Promise<void> {
    try {
      await this.client.applicationsApi.installApplication({ url });
    } catch (error) {
      throw toCliError(error, `Failed to install application from '${url}'`);
    }
  }

  async uninstall(identifier: string, force: boolean): Promise<void> {
    try {
      await this.client.applicationsApi.deleteApplicationInstallation(identifier, force);
    } catch (error) {
      throw toCliError(error, `Failed to uninstall application '${identifier}'`);
    }
  }

  async findManifestUrl(identifier: string): Promise<string | null> {
    const filter = encodeURIComponent(JSON.stringify({ slug: { _eq: identifier } }));
    const url = `https://developer.app.crowdin.net/items/Item?filter=${filter}&fields=manifest`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Unexpected response status: ${response.status}`);
      }

      const payload = (await response.json()) as AppStoreResponse;
      const manifest = payload.data?.[0]?.manifest;

      return manifest ?? null;
    } catch (error) {
      throw toCliError(error, `Failed to find application '${identifier}' in Crowdin Store`);
    }
  }
}
