import { describe, expect, test } from 'bun:test';
import { CrowdinError } from '@crowdin/crowdin-api-client';
import AuthorizationError from '@/cli/errors/AuthorizationError.ts';
import CliError, { ExitCode, getExitCode } from '@/cli/errors/CliError.ts';
import ForbiddenError from '@/cli/errors/ForbiddenError.ts';
import NotFoundError from '@/cli/errors/NotFoundError.ts';
import RateLimitError from '@/cli/errors/RateLimitError.ts';
import { mapCrowdinError, toCliError } from '@/cli/errors/toCliError.ts';
import ValidationError from '@/cli/errors/ValidationError.ts';

describe('mapCrowdinError', () => {
  test.each([
    [401, AuthorizationError, ExitCode.AUTHORIZATION],
    [403, ForbiddenError, ExitCode.FORBIDDEN],
    [404, NotFoundError, ExitCode.NOT_FOUND],
    [429, RateLimitError, ExitCode.RATE_LIMIT],
  ])('maps HTTP %i to the matching typed error and exit code', (httpCode, ErrorType, exitCode) => {
    const error = mapCrowdinError(new CrowdinError('boom', httpCode, {}), 'Failed to do thing');

    expect(error).toBeInstanceOf(ErrorType);
    expect(error.exitCode).toBe(exitCode);
  });

  test.each([400, 409, 500, 502])('maps unhandled HTTP %i to a generic CliError (exit 1)', (httpCode) => {
    const error = mapCrowdinError(new CrowdinError('boom', httpCode, {}), 'Failed to do thing');

    expect(error.constructor).toBe(CliError);
    expect(error.exitCode).toBe(ExitCode.GENERIC);
  });

  test('keeps the contextual fallback message and appends the api message', () => {
    const error = mapCrowdinError(new CrowdinError('not found', 404, {}), 'Failed to create file readme.md');

    expect(error.message).toBe('Failed to create file readme.md. not found');
  });

  test('replaces a 401 with the curated auth message (drops the contextual fallback)', () => {
    const error = mapCrowdinError(new CrowdinError('token expired', 401, {}), 'Failed to create file readme.md');

    expect(error).toBeInstanceOf(AuthorizationError);
    expect(error.message).toBe("Couldn't authorize. Check your 'api_token'");
  });

  test.each([
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
  ])('maps a wrapped connection error (%s) to the curated base_url hint', (token) => {
    // A bad base_url arrives as a CrowdinError with code 500 whose message is the raw connection token.
    const error = mapCrowdinError(new CrowdinError(token, 500, {}), 'Failed to fetch project');

    expect(error.constructor).toBe(CliError);
    expect(error.exitCode).toBe(ExitCode.GENERIC);
    expect(error.message).toBe("Invalid url. check your 'base_url'");
  });
});

describe('toCliError', () => {
  test('returns a CliError unchanged (preserving its exit code)', () => {
    const original = new RateLimitError('slow down');

    expect(toCliError(original, 'fallback')).toBe(original);
  });

  test('routes a CrowdinError through mapCrowdinError', () => {
    const error = toCliError(new CrowdinError('nope', 403, {}), 'Failed to fetch project');

    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.exitCode).toBe(ExitCode.FORBIDDEN);
  });

  test('wraps a plain Error as a generic CliError with the contextual message', () => {
    const error = toCliError(new Error('disk full'), 'Failed to write');

    expect(error.constructor).toBe(CliError);
    expect(error.exitCode).toBe(ExitCode.GENERIC);
    expect(error.message).toBe('Failed to write. disk full');
  });

  test('wraps a non-error value as a generic CliError with the fallback message', () => {
    const error = toCliError('weird', 'Failed to write');

    expect(error.constructor).toBe(CliError);
    expect(error.message).toBe('Failed to write');
  });
});

describe('getExitCode', () => {
  test('reads a CliError exit code', () => {
    expect(getExitCode(new ValidationError('bad config'))).toBe(ExitCode.VALIDATION);
  });

  test('reads a duck-typed numeric exitCode property (lib errors)', () => {
    // Mirrors FileNotFoundError / InvalidConfigurationError, which carry exitCode without importing cli/.
    expect(getExitCode({ exitCode: ExitCode.NOT_FOUND })).toBe(ExitCode.NOT_FOUND);
    expect(getExitCode(Object.assign(new Error('invalid'), { exitCode: ExitCode.VALIDATION }))).toBe(
      ExitCode.VALIDATION,
    );
  });

  test('ignores a non-numeric exitCode property', () => {
    expect(getExitCode({ exitCode: 'nope' })).toBe(ExitCode.GENERIC);
  });

  test('falls back to the generic exit code for a plain error or unknown value', () => {
    expect(getExitCode(new Error('boom'))).toBe(ExitCode.GENERIC);
    expect(getExitCode(undefined)).toBe(ExitCode.GENERIC);
  });
});
