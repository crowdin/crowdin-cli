import ConfigurationError from './ConfigurationError.ts';

export default class InvalidConfigurationError extends ConfigurationError {
  constructor(message: string = 'Invalid Configuration', options?: ErrorOptions) {
    super(message, options);
  }
}
