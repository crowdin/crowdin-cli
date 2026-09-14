import ConfigurationError from './ConfigurationError.ts';

export default class InvalidConfigurationError extends ConfigurationError {
  // Exit 2, the validation code. Hardcoded rather than imported from cli/errors ExitCode to keep
  // lib/ free of a cli/ dependency; cli.ts getExitCode duck-types this `exitCode` property.
  readonly exitCode = 2;

  constructor(message: string = 'Invalid Configuration', options?: ErrorOptions) {
    super(message, options);
  }
}
