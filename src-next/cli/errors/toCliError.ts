import { CrowdinError, CrowdinValidationError } from '@crowdin/crowdin-api-client';
import AuthorizationError from './AuthorizationError.ts';
import CliError from './CliError.ts';
import ForbiddenError from './ForbiddenError.ts';
import NotFoundError from './NotFoundError.ts';
import RateLimitError from './RateLimitError.ts';

// A connection failure arrives as a wrapped CrowdinError (code 500) whose message is the raw
// error from the HTTP layer. Two buckets, because they mean different things to the user:
//
//   ENOTFOUND  - DNS answered "no such host": the URL itself is wrong.
//   everything else - the name resolved (or the resolver was unreachable) and the socket failed:
//                     offline, captive portal, firewall dropping packets, host down. The base_url
//                     can be perfectly valid here, so pointing at it sends the user hunting a
//                     typo that doesn't exist.
const UNKNOWN_HOST_TOKENS = ['ENOTFOUND'];
const UNREACHABLE_TOKENS = [
  'ECONNREFUSED',
  'ECONNRESET',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  // Bun's fetch collapses connect failures into prose instead of an errno.
  'Unable to connect',
  'ConnectionRefused',
];

// Returns the curated message for a connection-layer failure, or undefined when the error is
// something else (an API status, a validation error, a bug).
function connectionMessage(message: string): string | undefined {
  if (UNKNOWN_HOST_TOKENS.some((token) => message.includes(token))) {
    return "Invalid url. check your 'base_url'";
  }

  if (UNREACHABLE_TOKENS.some((token) => message.includes(token))) {
    return "Couldn't connect to Crowdin. Check your internet connection and 'base_url'";
  }

  return undefined;
}

// Maps the HTTP status of an API error onto the matching exit code.
//
// 401 and an unknown host get curated text (they're unambiguous — a 401 always means a bad token,
// an unknown host always points at base_url). 403/404/429 stay contextual, because a fixed
// "project doesn't exist" would mislabel a file/branch/bundle 404.
export function mapCrowdinError(error: CrowdinError, fallbackMessage: string): CliError {
  if (error.code === 401) {
    return new AuthorizationError("Couldn't authorize. Check your 'api_token'");
  }

  const connection = connectionMessage(error.message);

  if (connection) {
    return new CliError(connection);
  }

  const message = `${fallbackMessage}. ${formatValidationMessage(error) ?? error.message}`;

  switch (error.code) {
    case 403:
      return new ForbiddenError(message);
    case 404:
      return new NotFoundError(message);
    case 429:
      return new RateLimitError(message);
    default:
      return new CliError(message);
  }
}

function formatValidationMessage(error: CrowdinError): string | undefined {
  if (!(error instanceof CrowdinValidationError) || !Array.isArray(error.apiError)) {
    return undefined;
  }

  const parts = error.apiError.flatMap((entry: { error?: { key?: unknown; errors?: unknown } }) => {
    const key = entry?.error?.key;
    const errors = entry?.error?.errors;

    if (typeof key !== 'string' || !Array.isArray(errors)) {
      return [];
    }

    return errors
      .filter((item: { message?: unknown }) => typeof item?.message === 'string')
      .map((item: { message: string }) => `Key: ${key}. Message: ${item.message}`);
  });

  return parts.length > 0 ? parts.join('; ') : undefined;
}

export function toCliError(error: unknown, fallbackMessage: string): CliError {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof CrowdinError) {
    return mapCrowdinError(error, fallbackMessage);
  }

  // Downloads bypass the api client (plain fetch on a signed URL), so a connection failure gets
  // here unwrapped — same cause, same message.
  if (error instanceof Error) {
    return new CliError(connectionMessage(error.message) ?? `${fallbackMessage}. ${error.message}`);
  }

  return new CliError(fallbackMessage);
}
