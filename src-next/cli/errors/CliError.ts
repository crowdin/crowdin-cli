export const ExitCode = {
  OK: 0,
  GENERIC: 1,
  VALIDATION: 2,
  AUTHORIZATION: 101,
  NOT_FOUND: 102,
  FORBIDDEN: 103,
  RATE_LIMIT: 129,
} as const;

export default class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = ExitCode.GENERIC,
    public reported: boolean = false,
  ) {
    super(message);
    this.name = 'CliError';
  }

  // Resolves the process exit code for any thrown value. CliError subclasses carry their own
  // code; lib errors (FileNotFoundError, InvalidConfigurationError) self-describe via a duck-typed
  // numeric `exitCode` property so lib/ needs no dependency on cli/. Everything else exits generic.
  static getExitCode(error: unknown): number {
    if (error instanceof CliError) {
      return error.exitCode;
    }

    if (typeof error === 'object' && error !== null && 'exitCode' in error) {
      const exitCode = (error as { exitCode?: unknown }).exitCode;

      if (typeof exitCode === 'number') {
        return exitCode;
      }
    }

    return ExitCode.GENERIC;
  }

  static getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
