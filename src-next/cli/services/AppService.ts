import { type ApplicationsModel, type Client, CrowdinError } from '@crowdin/crowdin-api-client';
import AppApiError from '@/cli/errors/AppApiError.ts';
import CliError from '@/cli/errors/CliError.ts';
import ForbiddenError from '@/cli/errors/ForbiddenError.ts';
import NotFoundError from '@/cli/errors/NotFoundError.ts';
import { connectionMessage, mapCrowdinError, toCliError } from '@/cli/errors/toCliError.ts';
import { buildUserAgent } from '@/cli/utils/userAgent.ts';
import { type ApiMethod, findMethodsByPath, joinVerbs, type Manifest, parseApiMethods } from '@/lib/apps/manifest.ts';
import { isOpenApiDocument, type OpenApiDocument } from '@/lib/apps/openapi.ts';
import { isRecord } from '@/lib/utils/record.ts';

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface ApiRequest {
  method: HttpMethod;
  /** The method path without a leading slash, as written. */
  path: string;
  /** Inline query plus GET/DELETE fields, without the `?`; empty when there is none. */
  query: string;
  /** undefined for GET and DELETE. */
  body: unknown;
}

const MANIFEST_TIMEOUT_MS = 15_000;
const OPENAPI_TIMEOUT_MS = 10_000;

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

  async installByManifestUrl(url: string): Promise<ApplicationsModel.Application> {
    try {
      const response = await this.client.applicationsApi.installApplication({ url });
      return response.data;
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

  /** The API methods the app's manifest declares; the installation itself carries no url or verb. */
  async listMethods(identifier: string): Promise<ApiMethod[]> {
    const installation = await this.getInstallation(identifier);
    const baseUrl = installation.baseUrl ?? '';

    if (isRecord(installation.manifest)) {
      return parseApiMethods(installation.manifest, baseUrl);
    }

    if (!installation.manifestUrl) {
      throw new CliError(`Application '${identifier}' has no manifest to read API methods from`);
    }

    return parseApiMethods(await this.fetchManifest(identifier, installation.manifestUrl), baseUrl);
  }

  /** Throws a plain Error with the reason; the caller treats the spec as optional. */
  async fetchOpenApi(url: string): Promise<OpenApiDocument> {
    const spec = await this.fetchJson(url, OPENAPI_TIMEOUT_MS);

    if (!isOpenApiDocument(spec)) {
      throw new Error(`${url} is not an OpenAPI document`);
    }

    return spec;
  }

  /** The URL the client sends `request` to. */
  requestUrl(identifier: string, request: ApiRequest): string {
    return `${this.client.applicationsApi.url}/applications/${identifier}/api/${this.requestPath(request)}`;
  }

  /** The app's result, unwrapped from Crowdin's `data` envelope; undefined when it sent no content. */
  async callApi(identifier: string, request: ApiRequest): Promise<unknown> {
    const api = this.client.applicationsApi;
    const path = this.requestPath(request);

    try {
      const response: unknown = await {
        GET: () => api.getApplicationData(identifier, path),
        POST: () => api.addApplicationData(identifier, path, request.body),
        PUT: () => api.updateOrRestoreApplicationData(identifier, path, request.body),
        PATCH: () => api.editApplicationData(identifier, path, request.body),
        DELETE: () => api.deleteApplicationData(identifier, path),
      }[request.method]();

      if (response === undefined || response === '') {
        return undefined;
      }

      return isRecord(response) && 'data' in response ? response.data : response;
    } catch (error) {
      throw await this.toApiError(error, identifier, request);
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

  private async getInstallation(identifier: string): Promise<ApplicationsModel.Application> {
    try {
      const response = await this.client.applicationsApi.getApplicationInstallation(identifier);
      return response.data;
    } catch (error) {
      if (error instanceof CrowdinError && error.code === 404) {
        throw new NotFoundError(
          `Application '${identifier}' is not installed. Run 'crowdin app list' to see installed applications`,
        );
      }

      throw toCliError(error, `Failed to read application '${identifier}'`);
    }
  }

  private async fetchManifest(identifier: string, url: string): Promise<Manifest> {
    try {
      const manifest = await this.fetchJson(url, MANIFEST_TIMEOUT_MS);

      if (!isRecord(manifest)) {
        throw new Error('the response is not a JSON object');
      }

      return manifest;
    } catch (error) {
      throw new CliError(
        `Failed to read the manifest of '${identifier}' from ${url}: ${CliError.getErrorMessage(error)}`,
      );
    }
  }

  // Origin comes from the client's `apiError`: the whole `{ data: { error } }` body for the app's own
  // errors, Crowdin's `error`/`errors` member for its own, nothing for a body it recognized as neither.
  private async toApiError(error: unknown, identifier: string, request: ApiRequest): Promise<CliError> {
    if (!(error instanceof CrowdinError)) {
      return toCliError(error, `Request to '${identifier}' failed`);
    }

    const status = error.code;

    if (isRecord(error.apiError) && 'data' in error.apiError) {
      return new AppApiError(identifier, status, error.message);
    }

    if (!error.apiError) {
      const connection = connectionMessage(error.message);

      return new CliError(
        connection ?? `Request to '${identifier}' failed with status ${status}`,
        connection ? undefined : AppApiError.exitCodeFor(status),
      );
    }

    switch (status) {
      case 403:
        return new ForbiddenError(
          `Crowdin refused the call to '${identifier}': ${error.message}. The token needs the 'application.proxy' scope and your user needs access to the application`,
        );
      case 404:
        return this.wrongVerbError(
          identifier,
          request,
          new NotFoundError(
            `Application '${identifier}' is not installed or does not declare '${request.method} ${request.path}'. Run 'crowdin app methods ${identifier}' to list its methods, and pass --method for anything but GET`,
          ),
        );
      case 405:
        return this.wrongVerbError(
          identifier,
          request,
          new CliError(`Crowdin returned ${status} for '${identifier}': ${error.message}`),
        );
      case 401:
      case 429:
        return mapCrowdinError(error, `Failed to call '${identifier}'`);
      default:
        return new CliError(`Crowdin returned ${status} for '${identifier}': ${error.message}`);
    }
  }

  // Apps answer an undeclared verb with 404 or 405, and Crowdin a missing app with 404; the manifest tells them apart.
  private async wrongVerbError(identifier: string, request: ApiRequest, fallback: CliError): Promise<CliError> {
    let methods: ApiMethod[];

    try {
      methods = await this.listMethods(identifier);
    } catch (error) {
      return error instanceof NotFoundError ? error : fallback;
    }

    const verbs = findMethodsByPath(methods, request.path).map((method) => method.method);

    if (verbs.length === 0) {
      return new NotFoundError(
        `Application '${identifier}' does not declare '${request.method} ${request.path}'. Run 'crowdin app methods ${identifier}' to list its methods`,
      );
    }

    if (verbs.includes(request.method)) {
      return fallback;
    }

    const flags = verbs.map((verb) => `-X ${verb}`);

    if (request.method === 'GET' && verbs.includes('POST')) {
      flags.push('--input');
    }

    return new NotFoundError(
      `Application '${identifier}' declares '${request.path}' for ${joinVerbs(verbs)}, not ${request.method}. Pass ${flags.join(' or ')}`,
    );
  }

  /** The path handed to the client, which prefixes it with `{apiUrl}/applications/{app}/api/`. */
  private requestPath(request: ApiRequest): string {
    return request.query ? `${request.path}?${request.query}` : request.path;
  }

  private async fetchJson(url: string, timeout: number): Promise<unknown> {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': buildUserAgent() },
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`unexpected response status ${response.status}`);
    }

    try {
      return await response.json();
    } catch {
      throw new Error('the response is not valid JSON');
    }
  }
}
