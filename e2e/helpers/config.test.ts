import { describe, expect, test } from 'bun:test';
import { renderConfig } from './config.ts';

describe('renderConfig', () => {
  test('substitutes projectId and token', () => {
    const out = renderConfig('project_id: "{{projectId}}"\napi_token: "{{token}}"', {
      projectId: 42,
      token: 'secret',
    });
    expect(out).toBe('project_id: "42"\napi_token: "secret"');
  });

  test('replaces every occurrence of a placeholder', () => {
    expect(renderConfig('{{token}} {{token}}', { projectId: 1, token: 't' })).toBe('t t');
  });

  test('throws on an unknown placeholder (typo, or a static value left as a template)', () => {
    expect(() => renderConfig('base_path: "{{basePath}}"', { projectId: 1, token: 't' })).toThrow(/basePath/);
  });
});
