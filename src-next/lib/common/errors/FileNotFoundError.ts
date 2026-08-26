export default class FileNotFoundError extends Error {
  // Java maps a missing config/identity/archive file to NotFoundException (exit 102).
  // Hardcoded rather than imported from cli/errors ExitCode to keep lib/ free of a cli/
  // dependency; cli.ts getExitCode duck-types this `exitCode` property.
  readonly exitCode = 102;

  constructor(message: string = 'File Not Found', options?: ErrorOptions) {
    super(message, options);
  }
}
