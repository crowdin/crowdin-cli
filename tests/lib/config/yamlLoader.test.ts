import { describe, expect, test } from 'bun:test';
import InvalidConfigurationError from '@/lib/config/errors/InvalidConfigurationError.ts';
import { mapConfig, parseYaml } from '@/lib/config/yamlLoader.ts';

const TOKEN = 'a'.repeat(80);

describe('parseYaml', () => {
  test('parses valid YAML into a raw record', () => {
    const raw = parseYaml('"project_id": "750373"\n"preserve_hierarchy": true\n');

    expect(raw).toEqual({ project_id: '750373', preserve_hierarchy: true });
  });

  test('wraps malformed YAML syntax as an InvalidConfigurationError', () => {
    // Unterminated flow sequence -> the YAML parser throws; the loader must surface exit-2 instead.
    expect(() => parseYaml('files: [ { source: "a"')).toThrow(InvalidConfigurationError);
  });

  test('rejects an empty config as an InvalidConfigurationError', () => {
    expect(() => parseYaml('')).toThrow(InvalidConfigurationError);
  });
});

describe('mapConfig', () => {
  test('maps snake_case literal keys to schema input and does not read env vars', () => {
    const out = mapConfig({
      project_id: '750373',
      api_token: TOKEN,
      base_path: '/x',
      base_url: 'https://x.crowdin.com',
      preserve_hierarchy: true,
      // an *_env key is not a literal value -> mapConfig must ignore it (env resolution is a cli layer)
      api_token_env: 'SOME_VAR',
    });

    expect(out).toMatchObject({
      projectId: '750373',
      apiToken: TOKEN,
      basePath: '/x',
      baseUrl: 'https://x.crowdin.com',
      preserveHierarchy: true,
    });
    expect(out).not.toHaveProperty('api_token_env');
  });
});
