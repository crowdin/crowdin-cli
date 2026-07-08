import { CrowdinError } from '@crowdin/crowdin-api-client';
import CliError from './CliError.ts';

export default class FileInUpdateError extends CliError {
  constructor() {
    super('File is currently being updated');
    this.name = 'FileInUpdateError';
  }

  // The API answers with 409 Conflict while a previous upload of the same file is still processing.
  static matches(error: unknown): boolean {
    return error instanceof CrowdinError && error.code === 409;
  }
}
