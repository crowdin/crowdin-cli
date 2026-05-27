import type { BundlesModel, Client } from '@crowdin/crowdin-api-client';
import CliError, { toCliError } from '@/cli/errors/CliError.ts';

export interface BundleView {
  id: number;
  name?: string;
  format?: string;
  exportPattern?: string;
  sourcePatterns?: string[];
  ignorePatterns?: string[];
  labelIds?: number[];
  includeProjectSourceLanguage?: boolean;
  includeInContextPseudoLanguage?: boolean;
  isMultilingual?: boolean;
  webUrl?: string;
  url?: string;
}

export type AddBundlePayload = BundlesModel.CreateBundleRequest;

export class BundleService {
  constructor(
    private client: Client,
    private projectId: number,
  ) {}

  async list(): Promise<BundleView[]> {
    try {
      const response = await this.client.bundlesApi.listBundles(this.projectId);
      return this.normalizeResponse<BundleView>(this.getResponseData(response));
    } catch (error) {
      throw toCliError(error, 'Failed to list bundles');
    }
  }

  async add(payload: AddBundlePayload): Promise<BundleView> {
    try {
      const response = await this.client.bundlesApi.addBundle(this.projectId, payload);
      return this.unwrapData<BundleView>(this.getResponseData(response));
    } catch (error) {
      throw toCliError(error, `Bundle was not added: '${JSON.stringify(payload)}'`);
    }
  }

  async get(bundleId: number): Promise<BundleView | null> {
    try {
      const response = await this.client.bundlesApi.getBundle(this.projectId, bundleId);
      return this.unwrapData<BundleView>(this.getResponseData(response));
    } catch (error) {
      if (this.isNotFoundError(error)) {
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

    if (bundle.url) {
      return bundle.url;
    }

    throw new CliError(`Bundle #${bundleId} URL is unavailable`);
  }

  private isNotFoundError(error: unknown): boolean {
    if (error && typeof error === 'object') {
      const maybeError = error as { statusCode?: number; status?: number; code?: string; message?: string };

      if (maybeError.statusCode === 404 || maybeError.status === 404 || maybeError.code === 'NotFound') {
        return true;
      }
    }

    if (error instanceof Error) {
      return error.message.toLowerCase().includes('not found');
    }

    return false;
  }

  private normalizeResponse<T>(data: unknown): T[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((entry) => this.unwrapData<T>(entry));
  }

  private getResponseData(response: unknown): unknown {
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { data: unknown }).data;
    }

    return response;
  }

  private unwrapData<T>(entry: unknown): T {
    if (entry && typeof entry === 'object' && 'data' in entry) {
      return (entry as { data: T }).data;
    }

    return entry as T;
  }
}
