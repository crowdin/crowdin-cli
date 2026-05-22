export default class ConfigurationError extends Error {
  constructor(message: string = 'Configuration Error', options?: ErrorOptions) {
    super(message, options);
  }
}
