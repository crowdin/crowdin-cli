import { type BundlesModel, type Client, CrowdinError } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import { toCliError } from '@/cli/errors/toCliError.ts';
import { pollUntilFinished } from '@/lib/api/pollStatus.ts';

export type BundleView = BundlesModel.Bundle & {
  includeInContextPseudoLanguage?: boolean;
};

export type AddBundlePayload = BundlesModel.CreateBundleRequest;

// Mirrors Java's executeRequestWithPossibleRetries: retry the export start on a transient
// "another export in progress" / server / network error before giving up.
const EXPORT_RETRY_ATTEMPTS = 3;
const EXPORT_RETRY_DELAY_MS = 3000;

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

  // Export is async server-side: start it (retrying a transient in-progress/5xx/network error),
  // wait for the status to finish, then return the export identifier for the download. onProgress
  // reports each poll's percentage so the command can update its spinner.
  async exportBundle(bundleId: number, onProgress?: (progress: number) => void): Promise<string> {
    const started = await this.startExport(bundleId);

    const finished = await pollUntilFinished(
      started,
      (exportId) => this.client.bundlesApi.checkBundleExportStatus(this.projectId, bundleId, exportId),
      'Failed to build the bundle',
      (status) => onProgress?.(status.progress),
    );

    return finished.data.identifier;
  }

  private async startExport(bundleId: number) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= EXPORT_RETRY_ATTEMPTS; attempt++) {
      try {
        return await this.client.bundlesApi.exportBundle(this.projectId, bundleId);
      } catch (error) {
        lastError = error;

        if (attempt < EXPORT_RETRY_ATTEMPTS && this.isRetryableExportError(error)) {
          await Bun.sleep(EXPORT_RETRY_DELAY_MS);
          continue;
        }

        throw toCliError(error, `Failed to build bundle #${bundleId}`);
      }
    }

    throw toCliError(lastError, `Failed to build bundle #${bundleId}`);
  }

  private isRetryableExportError(error: unknown): boolean {
    if (!(error instanceof CrowdinError)) {
      return false;
    }

    if (error.code >= 500 && error.code <= 599) {
      return true;
    }

    const message = error.message ?? '';

    return (
      message.includes("Another export is currently in progress. Please wait until it's finished.") ||
      message.includes('Request aborted') ||
      message.includes('Connection reset')
    );
  }

  async getDownloadUrl(bundleId: number, exportId: string): Promise<string> {
    try {
      const response = await this.client.bundlesApi.downloadBundle(this.projectId, bundleId, exportId);
      return response.data.url;
    } catch (error) {
      throw toCliError(error, `Failed to get bundle #${bundleId} download link`);
    }
  }
}
