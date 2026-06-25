import CliError, { ExitCode } from './CliError.ts';

export default class AuthorizationError extends CliError {
  constructor(message: string, reported: boolean = false) {
    super(message, ExitCode.AUTHORIZATION, reported);
    this.name = 'AuthorizationError';
  }
}
