import { CrowdinError } from '@crowdin/crowdin-api-client';
import AuthorizationError from './AuthorizationError.ts';
import CliError from './CliError.ts';
import ForbiddenError from './ForbiddenError.ts';
import NotFoundError from './NotFoundError.ts';
import RateLimitError from './RateLimitError.ts';

// Client normalizes an unreachable/misspelled base_url into a wrapped CrowdinError whose message
// is the raw connection code (code 500). Java matched "Name or service not known"; Bun collapses
// DNS-not-found and refused into these tokens instead.
const CONNECTION_ERROR_TOKENS = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'];

// Mirrors Java's CrowdinClientCore.standardErrorHandlers: maps the HTTP status of an
// API error onto the matching exit code. The Java substring branches (Project/Bundle Not
// Found, "upgrade subscription", ...) all collapse to the same code as their generic status
// sibling, so a pure status switch reproduces every exit code.
//
// Hybrid message strategy: 401 and invalid-url get Java's curated text (they're unambiguous —
// a 401 always means a bad token, an ECONNREFUSED always points at base_url). 403/404/429 stay
// contextual, because a fixed "project doesn't exist" would mislabel a file/branch/bundle 404.
export function mapCrowdinError(error: CrowdinError, fallbackMessage: string): CliError {
  if (error.code === 401) {
    return new AuthorizationError("Couldn't authorize. Check your 'api_token'");
  }

  // ponytail: Bun gives one signal for both DNS failure and refused connection, so both map to
  // the base_url hint — upgrade path is a finer probe if a genuine outage ever needs distinguishing.
  if (CONNECTION_ERROR_TOKENS.some((token) => error.message.includes(token))) {
    return new CliError("Invalid url. check your 'base_url'");
  }

  const message = `${fallbackMessage}. ${error.message}`;

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

export function toCliError(error: unknown, fallbackMessage: string): CliError {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof CrowdinError) {
    return mapCrowdinError(error, fallbackMessage);
  }

  if (error instanceof Error) {
    return new CliError(`${fallbackMessage}. ${error.message}`);
  }

  return new CliError(fallbackMessage);
}
