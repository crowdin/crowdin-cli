import { describe, expect, spyOn, test } from 'bun:test';
import { authorizeViaBrowser, getAuthorizationUrl, startBrowserAuthorization } from '@/cli/utils/browserAuth.ts';
import * as open from '@/cli/utils/open.ts';
import { createOutput } from '@/cli/utils/output.ts';

const CALLBACK_URL = 'http://localhost:46221/callback';

// The callback carries the access token as a JWT whose `domain` claim names the Enterprise
// organization; only the payload is ever read, so the signature is a placeholder.
function accessToken(payload: Record<string, unknown>): string {
  const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('browserAuth', () => {
  test('builds the OAuth authorization URL with the loopback callback', () => {
    const url = new URL(getAuthorizationUrl());

    expect(url.origin + url.pathname).toBe('https://accounts.crowdin.com/oauth/authorize');
    expect(url.searchParams.get('response_type')).toBe('token');
    expect(url.searchParams.get('redirect_uri')).toBe(CALLBACK_URL);
  });

  test('resolves with the token and the domain claim it carries', async () => {
    const token = accessToken({ domain: 'acme' });
    const authorization = startBrowserAuthorization();
    const response = await fetch(`${CALLBACK_URL}?access_token=${token}`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('You have successfully authenticated.');
    expect(await authorization).toEqual({ accessToken: token, domain: 'acme' });
  });

  test('reports no domain for a crowdin.com token', async () => {
    const token = accessToken({ domain: null });
    const authorization = startBrowserAuthorization();

    await fetch(`${CALLBACK_URL}?access_token=${token}`);

    expect(await authorization).toEqual({ accessToken: token, domain: null });
  });

  test('rejects with the error the callback reports', async () => {
    const authorization = startBrowserAuthorization();
    // The rejection is asserted below; keep it handled until then so it isn't reported as an
    // unhandled rejection while the callback is in flight.
    authorization.catch(() => {});

    const response = await fetch(`${CALLBACK_URL}?error=access_denied`);

    expect(await response.text()).toContain('Something went wrong.');
    await expect(authorization).rejects.toThrow('access_denied');
  });

  test('answers 404 on any other path and keeps waiting', async () => {
    const authorization = startBrowserAuthorization(50);
    const response = await fetch('http://localhost:46221/elsewhere');

    expect(response.status).toBe(404);
    await expect(authorization).rejects.toThrow('Timed out waiting for browser authorization');
  });

  test('rejects when no callback arrives before the timeout', async () => {
    await expect(startBrowserAuthorization(10)).rejects.toThrow('Timed out waiting for browser authorization');
  });

  test('opens the browser and waits for the callback', async () => {
    const openUrl = spyOn(open, 'openUrl').mockReturnValue(true);
    const output = createOutput({ verbose: false, config: '', colors: false, progress: false, output: 'text' });
    const token = accessToken({ domain: null });

    try {
      const authorization = authorizeViaBrowser(output);

      await fetch(`${CALLBACK_URL}?access_token=${token}`);

      expect(await authorization).toEqual({ accessToken: token, domain: null });
      expect(openUrl).toHaveBeenCalledWith(getAuthorizationUrl());
    } finally {
      openUrl.mockRestore();
    }
  });

  test('reports a failed authorization through the spinner', async () => {
    const openUrl = spyOn(open, 'openUrl').mockReturnValue(true);
    const output = createOutput({ verbose: false, config: '', colors: false, progress: false, output: 'text' });
    const spinner = spyOn(output, 'spinner');

    try {
      const authorization = authorizeViaBrowser(output);
      authorization.catch(() => {});

      await fetch(`${CALLBACK_URL}?error=access_denied`);

      await expect(authorization).rejects.toThrow('access_denied');
      expect(spinner).toHaveBeenLastCalledWith('browserAuth', 'error', 'Browser authorization failed');
    } finally {
      openUrl.mockRestore();
    }
  });

  test('prints the authorization link when no browser could be opened', async () => {
    const openUrl = spyOn(open, 'openUrl').mockReturnValue(false);
    const output = createOutput({ verbose: false, config: '', colors: false, progress: false, output: 'text' });
    const warning = spyOn(output, 'warning');

    try {
      const authorization = authorizeViaBrowser(output);

      await fetch(`${CALLBACK_URL}?access_token=${accessToken({ domain: null })}`);
      await authorization;

      expect(warning.mock.calls[0]?.[0]).toContain(getAuthorizationUrl());
    } finally {
      openUrl.mockRestore();
    }
  });
});
