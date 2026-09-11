import { describe, expect, test } from 'bun:test';
import { buildCredentials, getOrganization, isUrlForTesting } from '@/lib/organization/credentials.ts';

describe('getOrganization', () => {
  test('extracts enterprise organization like java implementation', () => {
    const cases: Array<[string, string | undefined]> = [
      ['https://Daanya.crowdin.com', 'Daanya'],
      ['https://Daanya.api.crowdin.com', 'Daanya'],
      ['https://crowdin.com', undefined],
      ['https://api.crowdin.com', undefined],
      ['https://apicustom.crowdin.com', 'apicustom'],
      ['https://apicustom.api.crowdin.com', 'apicustom'],
      ['andriy.crowdin.com', 'andriy'],
      ['https://organizzzation.daanya.crowdin.dev', 'organizzzation'],
      ['https://daanya.crowdin.dev', undefined],
      ['https://98011165-2619304c.test.crowdin.com', undefined],
      ['https://myorg.e-test.crowdin.com', 'myorg'],
    ];

    for (const [baseUrl, expected] of cases) {
      expect(getOrganization(baseUrl)).toBe(expected);
    }
  });
});

describe('isUrlForTesting', () => {
  test('flags internal dev/test hosts only', () => {
    expect(isUrlForTesting('https://myorg.e-test.crowdin.com')).toBe(true);
    expect(isUrlForTesting('https://98011165-2619304c.test.crowdin.com')).toBe(true);
    expect(isUrlForTesting('https://organizzzation.daanya.crowdin.dev')).toBe(true);
    expect(isUrlForTesting('https://daanya.crowdin.dev')).toBe(true);
    expect(isUrlForTesting('https://Daanya.crowdin.com')).toBe(false);
    expect(isUrlForTesting('https://crowdin.com')).toBe(false);
  });
});

describe('buildCredentials', () => {
  // Client derives the URL as `https://${org}.${apiDomain}/api/v2` (or without org).
  const url = (c: ReturnType<typeof buildCredentials>) => {
    const domain = c.apiDomain ?? 'api.crowdin.com';
    return c.organization ? `https://${c.organization}.${domain}/api/v2` : `https://${domain}/api/v2`;
  };

  test('resolves the correct API URL and never uses the deprecated baseUrl', () => {
    const cases: Array<[string, string]> = [
      ['https://Daanya.crowdin.com', 'https://Daanya.api.crowdin.com/api/v2'],
      ['https://crowdin.com', 'https://api.crowdin.com/api/v2'],
      ['https://myorg.e-test.crowdin.com', 'https://myorg.e-test.crowdin.com/api/v2'],
      ['https://98011165-2619304c.test.crowdin.com', 'https://98011165-2619304c.test.crowdin.com/api/v2'],
      ['https://organizzzation.daanya.crowdin.dev', 'https://organizzzation.daanya.crowdin.dev/api/v2'],
      ['https://daanya.crowdin.dev', 'https://daanya.crowdin.dev/api/v2'],
    ];

    for (const [baseUrl, expected] of cases) {
      const credentials = buildCredentials('token', baseUrl);
      expect(url(credentials)).toBe(expected);
      expect('baseUrl' in credentials).toBe(false);
    }
  });
});
