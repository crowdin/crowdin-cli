import { describe, expect, it } from 'bun:test';
import { ConfigSchema } from './config.ts';

// Regression: a present-but-short --token must not be rejected as an invalid config file. Java never
// length-checks the token (only rejects empty), letting the API return 401 for a bad one.
describe('ConfigSchema apiToken', () => {
  const parse = (apiToken: unknown) => ConfigSchema.safeParse({ projectId: 123, apiToken });

  it('accepts a short token (validity is the API job, not the config)', () => {
    expect(parse('SHORTTOKEN_1234567').success).toBe(true);
  });

  it('accepts an omitted token', () => {
    expect(ConfigSchema.safeParse({ projectId: 123 }).success).toBe(true);
  });

  it('rejects an empty token, matching Java missed_api_token', () => {
    const result = parse('');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Required option 'api_token' is missing");
  });
});
