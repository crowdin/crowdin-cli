import { type BundlesModel, type Client, CrowdinError } from '@crowdin/crowdin-api-client';
import CliError, { toCliError } from '@/cli/errors/CliError.ts';

export type BundleView = BundlesModel.Bundle & {
  includeInContextPseudoLanguage?: boolean;
};

export type AddBundlePayload = BundlesModel.CreateBundleRequest;

export class BundleService {
  constructor(
    private client: Client,
    private projectId: number,
  ) {}

  async list(): Promise<BundleView[]> {
    try {
      const response = await this.client.bundlesApi.listBundles(this.projectId);
      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, 'Failed to list bundles');
    }
  }

  async add(payload: AddBundlePayload): Promise<BundleView> {
    try {
      const response = await this.client.bundlesApi.addBundle(this.projectId, payload);
      return response.data;
    } catch (error) {
      throw toCliError(error, `Bundle was not added: '${JSON.stringify(payload)}'`);
    }
  }

  async get(bundleId: number): Promise<BundleView | null> {
    try {
      const response = await this.client.bundlesApi.getBundle(this.projectId, bundleId);
      return response.data;
    } catch (error) {
      if (error instanceof CrowdinError && Number(error.code) === 404) {
        return null;
      }

      throw toCliError(error, `Failed to load bundle #${bundleId}`);
    }
  }

  async delete(bundleId: number): Promise<void> {
    try {
      await this.client.bundlesApi.deleteBundle(this.projectId, bundleId);
    } catch (error) {
      throw toCliError(error, `Failed to delete bundle #${bundleId}`);
    }
  }

  async getBundleUrl(bundleId: number): Promise<string> {
    const bundle = await this.get(bundleId);

    if (!bundle) {
      throw new CliError("Couldn't find bundle by the specified ID");
    }

    if (bundle.webUrl) {
      return bundle.webUrl;
    }

    throw new CliError(`Bundle #${bundleId} URL is unavailable`);
  }
}
