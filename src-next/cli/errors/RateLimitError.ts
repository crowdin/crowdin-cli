import CliError, { ExitCode } from './CliError.ts';

export default class RateLimitError extends CliError {
  constructor(message: string, reported: boolean = false) {
    super(message, ExitCode.RATE_LIMIT, reported);
    this.name = 'RateLimitError';
  }
}
