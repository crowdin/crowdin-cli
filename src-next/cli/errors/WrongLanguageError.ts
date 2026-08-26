import { CrowdinError } from '@crowdin/crowdin-api-client';
import CliError from './CliError.ts';

// The API rejects an import when the storage file's detected language does not match the
// requested target language. Java's CrowdinProjectClient matches this on the message prefix.
const WRONG_LANGUAGE_MESSAGE_PREFIX = 'File is not allowed for the';

export default class WrongLanguageError extends CliError {
  constructor() {
    super('File is not allowed for the requested target language');
    this.name = 'WrongLanguageError';
  }

  static matches(error: unknown): boolean {
    return error instanceof CrowdinError && error.message.startsWith(WRONG_LANGUAGE_MESSAGE_PREFIX);
  }
}
