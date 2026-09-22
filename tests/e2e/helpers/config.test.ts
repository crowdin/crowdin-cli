import { describe, expect, test } from 'bun:test';
import { renderConfig } from './config.ts';

describe('renderConfig', () => {
  test('substitutes projectId and token', () => {
    const out = renderConfig('project_id: "{{projectId}}"\napi_token: "{{token}}"', {
      projectId: 42,
      token: 'secret',
      baseUrl: 'https://api.crowdin.com',
    });
    expect(out).toBe('project_id: "42"\napi_token: "secret"');
  });

  test('substitutes baseUrl', () => {
    expect(
      renderConfig('base_url: "{{baseUrl}}"', { projectId: 1, token: 't', baseUrl: 'https://acme.api.crowdin.com' }),
    ).toBe('base_url: "https://acme.api.crowdin.com"');
  });

  test('replaces every occurrence of a placeholder', () => {
    expect(renderConfig('{{token}} {{token}}', { projectId: 1, token: 't', baseUrl: 'u' })).toBe('t t');
  });

  test('JSON-encodes non-string values, so an array renders as a flow sequence', () => {
    expect(
      renderConfig('ignore: {{ignore}}', { projectId: 1, token: 't', baseUrl: 'u', ignore: ['/a/*.xml', '/b'] }),
    ).toBe('ignore: ["/a/*.xml","/b"]');
  });

  test('throws on an unknown placeholder (typo, or a static value left as a template)', () => {
    expect(() => renderConfig('base_path: "{{basePath}}"', { projectId: 1, token: 't', baseUrl: 'u' })).toThrow(
      /basePath/,
    );
  });
});
