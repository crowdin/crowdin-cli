import { CrowdinError } from '@crowdin/crowdin-api-client';
import AuthorizationError from './AuthorizationError.ts';
import CliError from './CliError.ts';
import ForbiddenError from './ForbiddenError.ts';
import NotFoundError from './NotFoundError.ts';
import RateLimitError from './RateLimitError.ts';

// Mirrors Java's CrowdinClientCore.standardErrorHandlers: maps the HTTP status of an
// API error onto the matching exit code. The Java substring branches (Project/Bundle Not
// Found, "upgrade subscription", ...) all collapse to the same code as their generic status
// sibling, so a pure status switch reproduces every exit code. Message stays contextual.
export function mapCrowdinError(error: CrowdinError, fallbackMessage: string): CliError {
  const message = `${fallbackMessage}. ${error.message}`;

  switch (error.code) {
    case 401:
      return new AuthorizationError(message);
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
