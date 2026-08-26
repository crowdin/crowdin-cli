import CliError, { ExitCode } from './CliError.ts';

export default class ForbiddenError extends CliError {
  constructor(message: string, reported: boolean = false) {
    super(message, ExitCode.FORBIDDEN, reported);
    this.name = 'ForbiddenError';
  }
}
