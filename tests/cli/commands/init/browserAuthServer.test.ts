import { describe, expect, test } from 'bun:test';
import { getAuthorizationUrl, startBrowserAuthorization } from '@/cli/commands/init/browserAuthServer.ts';

describe('browserAuthServer', () => {
  test('rejects when no callback arrives before the timeout', async () => {
    await expect(startBrowserAuthorization(10)).rejects.toThrow('Timed out waiting for browser authorization');
  });

  test('builds the OAuth authorization URL with the loopback callback', () => {
    const url = new URL(getAuthorizationUrl());

    expect(url.origin + url.pathname).toBe('https://accounts.crowdin.com/oauth/authorize');
    expect(url.searchParams.get('response_type')).toBe('token');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:46221/callback');
  });
});
