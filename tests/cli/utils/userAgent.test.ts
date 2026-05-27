import { describe, expect, test } from 'bun:test';
import os from 'node:os';
import packageJson from '../../../package.json';
import { buildUserAgent } from '@/cli/utils/userAgent.ts';

describe('buildUserAgent', () => {
  test('builds user agent from app version and os info', () => {
    const expected = `crowdin-cli/${packageJson.version} ${os.platform()}/${os.release()}`;

    expect(buildUserAgent()).toBe(expected);
  });

  test('does not include runtime marker', () => {
    const userAgent = buildUserAgent().toLowerCase();

    expect(userAgent).not.toContain('bun');
    expect(userAgent).not.toContain('node');
  });
});
