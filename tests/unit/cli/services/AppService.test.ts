import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client, CrowdinError } from '@crowdin/crowdin-api-client';
import AppApiError from '@/cli/errors/AppApiError.ts';
import AuthorizationError from '@/cli/errors/AuthorizationError.ts';
import CliError, { ExitCode } from '@/cli/errors/CliError.ts';
import ForbiddenError from '@/cli/errors/ForbiddenError.ts';
import NotFoundError from '@/cli/errors/NotFoundError.ts';
import { type ApiRequest, AppService } from '@/cli/services/AppService.ts';

describe('AppService', () => {
  let apiClient: Client;
  let appService: AppService;

  beforeEach(() => {
    apiClient = new Client({ token: 'a'.repeat(80) });
    appService = new AppService(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('list', () => {
    test('returns unwrapped installations', async () => {
      const listApplicationInstallations = mock(async () => ({
        data: [{ data: { identifier: 'app-1', name: 'App One' } }],
      }));
      spyOn(apiClient.applicationsApi, 'withFetchAll').mockReturnValue({ listApplicationInstallations } as never);

      expect(await appService.list()).toEqual([{ identifier: 'app-1', name: 'App One' }] as never);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.applicationsApi, 'withFetchAll').mockReturnValue({
        listApplicationInstallations: mock(async () => {
          throw new Error('forbidden');
        }),
      } as never);

      expect(appService.list()).rejects.toThrow(new CliError('Failed to list applications. forbidden'));
    });
  });

  describe('installByManifestUrl', () => {
    test('installs from the manifest url and returns the application', async () => {
      const install = spyOn(apiClient.applicationsApi, 'installApplication').mockResolvedValue({
        data: { identifier: 'app-1', name: 'App One' },
      } as never);

      expect(await appService.installByManifestUrl('https://example.test/manifest.json')).toEqual({
        identifier: 'app-1',
        name: 'App One',
      } as never);
      expect(install).toHaveBeenCalledWith({ url: 'https://example.test/manifest.json' });
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.applicationsApi, 'installApplication').mockRejectedValue(new Error('bad manifest'));
      expect(appService.installByManifestUrl('https://example.test/manifest.json')).rejects.toThrow(
        new CliError("Failed to install application from 'https://example.test/manifest.json'. bad manifest"),
      );
    });
  });

  describe('uninstall', () => {
    test('forwards the force flag', async () => {
      const remove = spyOn(apiClient.applicationsApi, 'deleteApplicationInstallation').mockResolvedValue(
        undefined as never,
      );

      await appService.uninstall('app-1', true);

      expect(remove).toHaveBeenCalledWith('app-1', true);
    });

    test('wraps API error as CliError', async () => {
      spyOn(apiClient.applicationsApi, 'deleteApplicationInstallation').mockRejectedValue(new Error('not installed'));
      expect(appService.uninstall('app-1', false)).rejects.toThrow(
        new CliError("Failed to uninstall application 'app-1'. not installed"),
      );
    });
  });

  describe('findManifestUrl', () => {
    test('queries the store by slug and returns the manifest', async () => {
      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
        Response.json({ docs: [{ manifest: 'https://example.test/manifest.json' }] }),
      );

      expect(await appService.findManifestUrl('my-app')).toBe('https://example.test/manifest.json');

      const requestedUrl = new URL(String(fetchSpy.mock.calls[0]?.[0]));

      expect(requestedUrl.origin + requestedUrl.pathname).toBe('https://developers.app.crowdin.net/api/items');
      expect(requestedUrl.searchParams.get('where[slug][equals]')).toBe('my-app');
    });

    test('returns null when the store has no matching item', async () => {
      spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ docs: [] }));
      expect(await appService.findManifestUrl('my-app')).toBeNull();
    });

    test('returns null when the matched item carries no manifest', async () => {
      spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ docs: [{}] }));
      expect(await appService.findManifestUrl('my-app')).toBeNull();
    });

    test('wraps a non-ok store response as CliError', async () => {
      spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 503 }));
      expect(appService.findManifestUrl('my-app')).rejects.toThrow(
        new CliError("Failed to find application 'my-app' in Crowdin Store. Unexpected response status: 503"),
      );
    });

    test('wraps a network failure as CliError', async () => {
      spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
      expect(appService.findManifestUrl('my-app')).rejects.toThrow(
        new CliError("Failed to find application 'my-app' in Crowdin Store. offline"),
      );
    });
  });

  describe('listMethods', () => {
    const manifest = { modules: { api: [{ key: 'k', name: 'Get Settings', url: '/settings', method: 'get' }] } };
    const settings = {
      method: 'GET',
      path: 'settings',
      name: 'Get Settings',
      description: null,
      key: 'k',
      documentationUrl: null,
    };

    const installed = (overrides: Record<string, unknown>) =>
      spyOn(apiClient.applicationsApi, 'getApplicationInstallation').mockResolvedValue({
        data: {
          identifier: 'app-1',
          baseUrl: 'https://app.test',
          manifestUrl: 'https://app.test/manifest.json',
          ...overrides,
        },
      } as never);

    test('reads the inline manifest without fetching', async () => {
      installed({ manifest });

      const fetchSpy = spyOn(globalThis, 'fetch');

      expect(await appService.listMethods('app-1')).toEqual([settings]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('fetches the hosted manifest with the CLI user agent', async () => {
      installed({ manifest: null });

      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(manifest));

      expect(await appService.listMethods('app-1')).toEqual([settings]);
      expect(String(fetchSpy.mock.calls[0]?.[0])).toBe('https://app.test/manifest.json');
      expect(fetchSpy.mock.calls[0]?.[1]?.headers).toMatchObject({
        Accept: 'application/json',
        'User-Agent': expect.stringMatching(/^crowdin-cli\//),
      });
    });

    test('fails without any manifest', async () => {
      installed({ manifest: 'oops', manifestUrl: null });

      expect(appService.listMethods('app-1')).rejects.toThrow(
        new CliError("Application 'app-1' has no manifest to read API methods from"),
      );
    });

    test('maps 404 to the not-installed message', async () => {
      spyOn(apiClient.applicationsApi, 'getApplicationInstallation').mockRejectedValue(
        new CrowdinError('Not found', 404, { message: 'Not found', code: 404 }),
      );

      expect(appService.listMethods('app-1')).rejects.toThrow(
        new NotFoundError("Application 'app-1' is not installed. Run 'crowdin app list' to see installed applications"),
      );
    });

    test.each([
      [new Response('nope', { status: 500 }), 'unexpected response status 500'],
      [new Response('not json'), 'the response is not valid JSON'],
      [Response.json([1, 2]), 'the response is not a JSON object'],
    ])('reports a manifest fetch failure %#', async (response, reason) => {
      installed({ manifest: null });

      spyOn(globalThis, 'fetch').mockResolvedValue(response);

      expect(appService.listMethods('app-1')).rejects.toThrow(
        new CliError(`Failed to read the manifest of 'app-1' from https://app.test/manifest.json: ${reason}`),
      );
    });

    test('reports a manifest fetch timeout', async () => {
      installed({ manifest: null });

      spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));

      expect(appService.listMethods('app-1')).rejects.toThrow(
        "Failed to read the manifest of 'app-1' from https://app.test/manifest.json: The operation timed out.",
      );
    });
  });

  describe('fetchOpenApi', () => {
    test('returns an OpenAPI document', async () => {
      spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ openapi: '3.0.0', paths: {} }));
      expect(await appService.fetchOpenApi('https://app.test/swagger.json')).toEqual({ openapi: '3.0.0', paths: {} });
    });

    test('rejects other JSON', async () => {
      spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ hello: 'world' }));
      expect(appService.fetchOpenApi('https://app.test/swagger.json')).rejects.toThrow('is not an OpenAPI document');
    });
  });

  describe('callApi', () => {
    const get: ApiRequest = { method: 'GET', path: 'settings', query: 'projectId=12', body: undefined };

    test.each([
      ['GET', 'getApplicationData', undefined],
      ['POST', 'addApplicationData', { a: 1 }],
      ['PUT', 'updateOrRestoreApplicationData', { a: 1 }],
      ['PATCH', 'editApplicationData', { a: 1 }],
      ['DELETE', 'deleteApplicationData', undefined],
    ] as const)('dispatches %s to %s', async (method, clientMethod, body) => {
      const call = spyOn(apiClient.applicationsApi, clientMethod).mockResolvedValue({ data: 'ok' } as never);

      expect(await appService.callApi('app-1', { method, path: 'x', query: 'q=1', body })).toBe('ok');
      expect(call).toHaveBeenCalledWith('app-1', 'x?q=1', ...(body ? [body] : []));
    });

    test('sends a bare path when there is no query', async () => {
      const call = spyOn(apiClient.applicationsApi, 'getApplicationData').mockResolvedValue({ data: 'ok' } as never);

      await appService.callApi('app-1', { ...get, path: 'job-info', query: '' });

      expect(call).toHaveBeenCalledWith('app-1', 'job-info');
    });

    test('returns a body without a data envelope as is', async () => {
      spyOn(apiClient.applicationsApi, 'getApplicationData').mockResolvedValue({ files: [] } as never);
      expect(await appService.callApi('app-1', get)).toEqual({ files: [] });
    });

    test.each([[undefined], ['']])('returns undefined for an empty body (%p)', async (response) => {
      spyOn(apiClient.applicationsApi, 'deleteApplicationData').mockResolvedValue(response as never);
      expect(await appService.callApi('app-1', { ...get, method: 'DELETE' })).toBeUndefined();
    });

    test('keeps a JSON null result', async () => {
      spyOn(apiClient.applicationsApi, 'getApplicationData').mockResolvedValue(null as never);
      expect(await appService.callApi('app-1', get)).toBeNull();
    });

    test('passes the app error message through', async () => {
      const apiError = { data: { error: { message: 'Missing required parameter: projectId' } } };
      spyOn(apiClient.applicationsApi, 'getApplicationData').mockRejectedValue(
        new CrowdinError('Missing required parameter: projectId', 400, apiError),
      );

      const error = (await appService.callApi('app-1', get).catch((caught) => caught)) as AppApiError;

      expect(error).toBeInstanceOf(AppApiError);
      expect(error.message).toBe("'app-1' returned 400: Missing required parameter: projectId");
      expect(error.exitCode).toBe(ExitCode.GENERIC);
    });

    test.each([
      [403, ExitCode.FORBIDDEN],
      [404, ExitCode.NOT_FOUND],
    ])('maps an app %d to exit %d', async (status, exitCode) => {
      spyOn(apiClient.applicationsApi, 'getApplicationData').mockRejectedValue(
        new CrowdinError('nope', status, { data: { error: { message: 'nope' } } }),
      );

      expect(appService.callApi('app-1', get)).rejects.toMatchObject({
        exitCode,
        message: `'app-1' returned ${status}: nope`,
      });
    });

    test('maps a Crowdin 401 to the curated message', async () => {
      spyOn(apiClient.applicationsApi, 'getApplicationData').mockRejectedValue(
        new CrowdinError('Unauthorized', 401, { message: 'Unauthorized', code: 401 }),
      );

      expect(appService.callApi('app-1', get)).rejects.toThrow(
        new AuthorizationError("Couldn't authorize. Check your 'api_token'"),
      );
    });

    test('maps a Crowdin 403 to the proxy scope hint', async () => {
      spyOn(apiClient.applicationsApi, 'getApplicationData').mockRejectedValue(
        new CrowdinError('Forbidden', 403, { message: 'Forbidden', code: 403 }),
      );

      expect(appService.callApi('app-1', get)).rejects.toThrow(
        new ForbiddenError(
          "Crowdin refused the call to 'app-1': Forbidden. The token needs the 'application.proxy' scope and your user needs access to the application",
        ),
      );
    });

    describe('Crowdin 404 and 405', () => {
      const update: ApiRequest = { method: 'GET', path: 'crowdin-update', query: '', body: undefined };
      const declareMethods = (...methods: string[]) =>
        spyOn(apiClient.applicationsApi, 'getApplicationInstallation').mockResolvedValue({
          data: {
            identifier: 'app-1',
            manifest: { modules: { api: methods.map((method) => ({ url: '/crowdin-update', method })) } },
          },
        } as never);
      const callFails = (request: ApiRequest) => {
        const clientMethod = request.method === 'GET' ? 'getApplicationData' : 'updateOrRestoreApplicationData';

        spyOn(apiClient.applicationsApi, clientMethod).mockRejectedValue(
          new CrowdinError('Not found', 404, { message: 'Not found', code: 404 }),
        );

        return appService.callApi('app-1', request);
      };

      test('names the declared verb and how to send it', async () => {
        declareMethods('post');

        expect(callFails(update)).rejects.toThrow(
          new NotFoundError("Application 'app-1' declares 'crowdin-update' for POST, not GET. Pass -X POST or --input"),
        );
      });

      test('offers --input only for POST', async () => {
        declareMethods('patch', 'delete');

        expect(callFails({ ...update, method: 'PUT', body: {} })).rejects.toThrow(
          new NotFoundError(
            "Application 'app-1' declares 'crowdin-update' for PATCH and DELETE, not PUT. Pass -X PATCH or -X DELETE",
          ),
        );
      });

      test('names the declared verb on a 405', async () => {
        declareMethods('post');

        spyOn(apiClient.applicationsApi, 'getApplicationData').mockRejectedValue(
          new CrowdinError('Method Not Allowed', 405, { message: 'Method Not Allowed', code: 405 }),
        );

        expect(appService.callApi('app-1', update)).rejects.toThrow(
          new NotFoundError("Application 'app-1' declares 'crowdin-update' for POST, not GET. Pass -X POST or --input"),
        );
      });

      test('keeps the status message on a 405 the manifest does not explain', async () => {
        declareMethods('get');

        spyOn(apiClient.applicationsApi, 'getApplicationData').mockRejectedValue(
          new CrowdinError('Method Not Allowed', 405, { message: 'Method Not Allowed', code: 405 }),
        );

        expect(appService.callApi('app-1', update)).rejects.toThrow(
          new CliError("Crowdin returned 405 for 'app-1': Method Not Allowed"),
        );
      });

      test('reports an undeclared path', async () => {
        declareMethods();

        expect(callFails(update)).rejects.toThrow(
          new NotFoundError(
            "Application 'app-1' does not declare 'GET crowdin-update'. Run 'crowdin app methods app-1' to list its methods",
          ),
        );
      });

      test('reports a missing app', async () => {
        spyOn(apiClient.applicationsApi, 'getApplicationInstallation').mockRejectedValue(
          new CrowdinError('Not found', 404, { message: 'Not found', code: 404 }),
        );

        expect(callFails(update)).rejects.toThrow(
          new NotFoundError(
            "Application 'app-1' is not installed. Run 'crowdin app list' to see installed applications",
          ),
        );
      });

      test.each([
        [
          'the lookup fails',
          () => spyOn(apiClient.applicationsApi, 'getApplicationInstallation').mockRejectedValue(new Error('boom')),
        ],
        ['the sent verb is declared', () => declareMethods('get')],
      ])('keeps the ambiguous message when %s', async (_, arrange) => {
        arrange();

        expect(callFails(update)).rejects.toThrow(
          new NotFoundError(
            "Application 'app-1' is not installed or does not declare 'GET crowdin-update'. Run 'crowdin app methods app-1' to list its methods, and pass --method for anything but GET",
          ),
        );
      });
    });

    test('maps other Crowdin errors with the status', async () => {
      spyOn(apiClient.applicationsApi, 'getApplicationData').mockRejectedValue(
        new CrowdinError('Boom', 500, { message: 'Boom', code: 500 }),
      );

      expect(appService.callApi('app-1', get)).rejects.toThrow(new CliError("Crowdin returned 500 for 'app-1': Boom"));
    });

    test('reports an unrecognized error body without claiming an origin', async () => {
      spyOn(apiClient.applicationsApi, 'getApplicationData').mockRejectedValue(
        new CrowdinError('Request failed with status code 403', 403, null),
      );

      expect(appService.callApi('app-1', get)).rejects.toMatchObject({
        message: "Request to 'app-1' failed with status 403",
        exitCode: ExitCode.FORBIDDEN,
      });
    });

    test('keeps the curated connection message', async () => {
      spyOn(apiClient.applicationsApi, 'getApplicationData').mockRejectedValue(
        new CrowdinError('getaddrinfo ENOTFOUND api.crowdin.com', 500, null),
      );

      expect(appService.callApi('app-1', get)).rejects.toMatchObject({
        message: "Invalid url. check your 'base_url'",
        exitCode: ExitCode.GENERIC,
      });
    });
  });

  test('requestUrl composes the URL the client calls', () => {
    expect(appService.requestUrl('app-1', { method: 'GET', path: 'jobs', query: 'a=1', body: undefined })).toBe(
      'https://api.crowdin.com/api/v2/applications/app-1/api/jobs?a=1',
    );
    expect(
      new AppService(new Client({ token: 't', organization: 'acme' })).requestUrl('app-1', {
        method: 'GET',
        path: 'jobs',
        query: '',
        body: undefined,
      }),
    ).toBe('https://acme.api.crowdin.com/api/v2/applications/app-1/api/jobs');
  });
});
