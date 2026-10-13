import { describe, expect, test } from 'bun:test';
import { findMethodsByPath, parseApiMethods } from '@/lib/apps/manifest.ts';

const BASE = 'https://zendesk-guide.app.crowdin.net';

const manifest = {
  modules: {
    api: [
      {
        key: 'crowdin-files-api',
        name: 'Get Crowdin Files',
        url: '/crowdin-files',
        method: 'get',
        description: 'Get a list of synced files',
        documentationUrl: '/api-docs#tag/Files/operation/crowdin.files',
      },
      { key: 'jobs', name: 'Get Jobs', url: '/jobs', method: 'GET' },
      { key: 'jobs', name: 'Cancel Job', url: 'jobs', method: 'DELETE', documentationUrl: 'https://docs.test/x' },
    ],
  },
};

describe('parseApiMethods', () => {
  test('normalizes entries in manifest order', () => {
    expect(parseApiMethods(manifest, `${BASE}/`)).toEqual([
      {
        method: 'GET',
        path: 'crowdin-files',
        name: 'Get Crowdin Files',
        description: 'Get a list of synced files',
        key: 'crowdin-files-api',
        documentationUrl: `${BASE}/api-docs#tag/Files/operation/crowdin.files`,
      },
      { method: 'GET', path: 'jobs', name: 'Get Jobs', description: null, key: 'jobs', documentationUrl: null },
      {
        method: 'DELETE',
        path: 'jobs',
        name: 'Cancel Job',
        description: null,
        key: 'jobs',
        documentationUrl: 'https://docs.test/x',
      },
    ]);
  });

  test('skips entries without a url or method', () => {
    const partial = { modules: { api: [{ url: '/a' }, { method: 'GET' }, 'junk', { url: '/b', method: 'post' }] } };

    expect(parseApiMethods(partial, BASE).map((method) => `${method.method} ${method.path}`)).toEqual(['POST b']);
  });

  test.each([[{}], [{ modules: {} }], [{ modules: { api: [] } }], [{ modules: { api: 'nope' } }]])(
    'declares no methods for %p',
    (value) => {
      expect(parseApiMethods(value, BASE)).toEqual([]);
    },
  );
});

describe('findMethodsByPath', () => {
  const methods = parseApiMethods(manifest, BASE);

  test('matches with or without a leading slash and returns every verb', () => {
    expect(findMethodsByPath(methods, '/jobs').map((method) => method.method)).toEqual(['GET', 'DELETE']);
    expect(findMethodsByPath(methods, 'crowdin-files')).toHaveLength(1);
    expect(findMethodsByPath(methods, 'missing')).toEqual([]);
  });
});
