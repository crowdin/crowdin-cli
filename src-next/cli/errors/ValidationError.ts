import CliError, { ExitCode } from './CliError.ts';

export default class ValidationError extends CliError {
  constructor(message: string, reported: boolean = false) {
    super(message, ExitCode.VALIDATION, reported);
    this.name = 'ValidationError';
  }
}
