import { afterEach, describe, expect, test } from 'bun:test';
import { proxyUrlFromEnv } from '@/cli/utils/proxy.ts';

const VARS = ['HTTP_PROXY_HOST', 'HTTP_PROXY_PORT', 'HTTP_PROXY_USER', 'HTTP_PROXY_PASSWORD'];

function setEnv(env: Record<string, string | undefined>) {
  for (const v of VARS) {
    delete process.env[v];
  }
  for (const [k, val] of Object.entries(env)) {
    if (val !== undefined) {
      process.env[k] = val;
    }
  }
}

afterEach(() => setEnv({}));

describe('proxyUrlFromEnv', () => {
  test('returns undefined when host/port unset', () => {
    setEnv({});
    expect(proxyUrlFromEnv()).toBeUndefined();
  });

  test('returns undefined when port missing', () => {
    setEnv({ HTTP_PROXY_HOST: 'proxy.local' });
    expect(proxyUrlFromEnv()).toBeUndefined();
  });

  test('returns undefined when port not numeric', () => {
    setEnv({ HTTP_PROXY_HOST: 'proxy.local', HTTP_PROXY_PORT: 'abc' });
    expect(proxyUrlFromEnv()).toBeUndefined();
  });

  test('builds url without credentials', () => {
    setEnv({ HTTP_PROXY_HOST: 'proxy.local', HTTP_PROXY_PORT: '8080' });
    expect(proxyUrlFromEnv()).toBe('http://proxy.local:8080');
  });

  test('ignores creds when only user set', () => {
    setEnv({ HTTP_PROXY_HOST: 'proxy.local', HTTP_PROXY_PORT: '8080', HTTP_PROXY_USER: 'u' });
    expect(proxyUrlFromEnv()).toBe('http://proxy.local:8080');
  });

  test('builds url with credentials', () => {
    setEnv({
      HTTP_PROXY_HOST: 'proxy.local',
      HTTP_PROXY_PORT: '8080',
      HTTP_PROXY_USER: 'user',
      HTTP_PROXY_PASSWORD: 'pass',
    });
    expect(proxyUrlFromEnv()).toBe('http://user:pass@proxy.local:8080');
  });

  test('encodes special chars in credentials', () => {
    setEnv({
      HTTP_PROXY_HOST: 'proxy.local',
      HTTP_PROXY_PORT: '8080',
      HTTP_PROXY_USER: 'u@me',
      HTTP_PROXY_PASSWORD: 'p:ss/w@rd',
    });
    expect(proxyUrlFromEnv()).toBe('http://u%40me:p%3Ass%2Fw%40rd@proxy.local:8080');
  });
});
