import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { Client } from '@crowdin/crowdin-api-client';
import CliError from '@/cli/errors/CliError.ts';
import { AppService } from '@/cli/services/AppService.ts';

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
        Response.json({ data: [{ manifest: 'https://example.test/manifest.json' }] }),
      );

      expect(await appService.findManifestUrl('my-app')).toBe('https://example.test/manifest.json');

      const requestedUrl = String(fetchSpy.mock.calls[0]?.[0]);

      expect(requestedUrl).toStartWith('https://developer.app.crowdin.net/items/Item?filter=');
      // The slug travels as a URL-encoded Directus filter, so the raw JSON must not leak into the query.
      expect(requestedUrl).toContain(encodeURIComponent(JSON.stringify({ slug: { _eq: 'my-app' } })));
    });

    test('returns null when the store has no matching item', async () => {
      spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data: [] }));

      expect(await appService.findManifestUrl('my-app')).toBeNull();
    });

    test('returns null when the matched item carries no manifest', async () => {
      spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data: [{}] }));

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
});
