export default class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = 1,
    public readonly reported: boolean = false,
  ) {
    super(message);
    this.name = 'CliError';
  }
}

export function toCliError(error: unknown, fallbackMessage: string): CliError {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof Error) {
    return new CliError(`${fallbackMessage}. ${error.message}`);
  }

  return new CliError(fallbackMessage);
}
