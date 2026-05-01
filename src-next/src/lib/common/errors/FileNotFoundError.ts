export default class FileNotFoundError extends Error {
  constructor(message: string = 'File Not Found', options?: ErrorOptions) {
    super(message, options);
  }
}
