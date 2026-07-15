import { describe, expect, test } from 'bun:test';
import { CrowdinError } from '@crowdin/crowdin-api-client';
import { ExitCode } from '@/cli/errors/CliError.ts';
import { toCliError } from '@/cli/errors/toCliError.ts';

// Regression (#8): the same 401 must yield the same exit code and message from every command. Java
// mapped HTTP status → exit code centrally (CrowdinClientCore); a service hardcoding exit 1 broke parity.
describe('toCliError HTTP status mapping', () => {
  test.each([
    [401, ExitCode.AUTHORIZATION, "Couldn't authorize. Check your 'api_token'"],
    [403, ExitCode.FORBIDDEN, 'ctx. Forbidden'],
    [404, ExitCode.NOT_FOUND, 'ctx. Not Found'],
    [429, ExitCode.RATE_LIMIT, 'ctx. Too Many Requests'],
    [500, ExitCode.GENERIC, 'ctx. Server Error'],
  ])('maps CrowdinError %i to exit %i regardless of fallback', (code, exit, message) => {
    const statusText = { 403: 'Forbidden', 404: 'Not Found', 429: 'Too Many Requests', 500: 'Server Error' }[code];
    const cliError = toCliError(new CrowdinError(statusText ?? 'Unauthorized', code, null), 'ctx');

    expect(cliError.exitCode).toBe(exit);
    expect(cliError.message).toBe(message);
  });

  test('collapses connection failures to the base_url hint', () => {
    const cliError = toCliError(new CrowdinError('getaddrinfo ENOTFOUND api.crowdin.com', 500, null), 'ctx');

    expect(cliError.message).toBe("Invalid url. check your 'base_url'");
  });
});
