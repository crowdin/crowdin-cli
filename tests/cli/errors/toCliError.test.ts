import { describe, expect, test } from 'bun:test';
import { CrowdinError, CrowdinValidationError } from '@crowdin/crowdin-api-client';
import { ExitCode } from '@/cli/errors/CliError.ts';
import { toCliError } from '@/cli/errors/toCliError.ts';

// the same 401 must yield the same exit code and message from every command. Java
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

  test('collapses an unknown host to the base_url hint', () => {
    const cliError = toCliError(new CrowdinError('getaddrinfo ENOTFOUND api.crowdin.com', 500, null), 'ctx');

    expect(cliError.message).toBe("Invalid url. check your 'base_url'");
  });

  // Downloads use plain fetch on a signed URL, so the failure never passes through the api client.
  test('maps a bare connection error to the connectivity hint', () => {
    const cliError = toCliError(new Error('connect ECONNREFUSED 54.173.33.148:443'), 'Failed to download file');

    expect(cliError.message).toBe("Couldn't connect to Crowdin. Check your internet connection and 'base_url'");
  });

  // the client's own message says only "Value is required and can't be empty" — without the field
  // name there is no way to tell which option the user has to fix.
  test('names the offending field on a validation error', () => {
    const apiError = [
      { error: { key: 'identifier', errors: [{ code: 'isEmpty', message: "Value is required and can't be empty" }] } },
    ];
    const cliError = toCliError(
      new CrowdinValidationError("Value is required and can't be empty", [], apiError),
      'Source string was not added',
    );

    expect(cliError.message).toBe(
      "Source string was not added. Key: identifier. Message: Value is required and can't be empty",
    );
  });

  test('keeps every field apart when several of them fail', () => {
    const apiError = [
      { error: { key: 'identifier', errors: [{ code: 'isEmpty', message: 'Value is required' }] } },
      { error: { key: 'maxLength', errors: [{ code: 'notInRange', message: 'Value is invalid' }] } },
    ];
    const cliError = toCliError(new CrowdinValidationError('Value is required, Value is invalid', [], apiError), 'ctx');

    expect(cliError.message).toBe(
      'ctx. Key: identifier. Message: Value is required; Key: maxLength. Message: Value is invalid',
    );
  });

  test('keeps the raw message when a validation error carries no field names', () => {
    const cliError = toCliError(new CrowdinValidationError('Validation error', [], null), 'ctx');

    expect(cliError.message).toBe('ctx. Validation error');
  });
});
