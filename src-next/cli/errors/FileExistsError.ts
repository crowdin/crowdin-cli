import { CrowdinError } from '@crowdin/crowdin-api-client';
import CliError from './CliError.ts';

export default class FileExistsError extends CliError {
  constructor() {
    super('Project already contains the file');
    this.name = 'FileExistsError';
  }

  // The API rejects a new file whose name collides with an existing project file ("Name must be unique").
  static matches(error: unknown): boolean {
    if (!(error instanceof CrowdinError)) {
      return false;
    }

    return `${error.message} ${JSON.stringify(error.apiError ?? '')}`.includes('Name must be unique');
  }
}
