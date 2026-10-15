import CliError, { ExitCode } from './CliError.ts';

/** An error the application itself returned through Crowdin's proxy; its message passes through verbatim. */
export default class AppApiError extends CliError {
  constructor(
    app: string,
    public readonly status: number,
    appMessage: string,
  ) {
    super(`'${app}' returned ${status}: ${appMessage}`, AppApiError.exitCodeFor(status));
    this.name = 'AppApiError';
  }

  static exitCodeFor(status: number): number {
    switch (status) {
      case 403:
        return ExitCode.FORBIDDEN;
      case 404:
        return ExitCode.NOT_FOUND;
      default:
        return ExitCode.GENERIC;
    }
  }
}
