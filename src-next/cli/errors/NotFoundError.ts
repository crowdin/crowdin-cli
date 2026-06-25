import CliError, { ExitCode } from './CliError.ts';

export default class NotFoundError extends CliError {
  constructor(message: string, reported: boolean = false) {
    super(message, ExitCode.NOT_FOUND, reported);
    this.name = 'NotFoundError';
  }
}
