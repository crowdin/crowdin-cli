import ValidationError from '@/cli/errors/ValidationError.ts';
import { type ApiRequest, HTTP_METHODS, type HttpMethod } from '@/cli/services/AppService.ts';
import type { Fields } from './fields.ts';

/**
 * RFC 3986 path characters without `%`. URL parsing strips whitespace and control characters, cuts the path at
 * `#`, treats `\` as `/` and resolves percent-encoded dots, so anything outside this set could reshape the path.
 */
const API_PATH = /^[A-Za-z0-9._~!$&'()*+,;=:@/-]+$/;

export function parseHttpMethod(value: string): HttpMethod {
  const method = value.toUpperCase();

  if (!(HTTP_METHODS as readonly string[]).includes(method)) {
    throw new ValidationError(`Unsupported method '${value}'. Use one of: ${HTTP_METHODS.join(', ')}`);
  }

  return method as HttpMethod;
}

/**
 * Fields never change the verb: most app reads take `projectId` as a field, so a field-implies-POST
 * rule would send every read to a verb the app does not declare. `readInput` runs only once the
 * request is known to carry a body, so `--input -` never blocks on stdin for a rejected call.
 */
export function buildApiRequest({
  path,
  method,
  fields,
  readInput,
}: {
  path: string;
  method?: string;
  fields: Fields;
  readInput?: () => unknown;
}): ApiRequest {
  const separator = path.indexOf('?');
  const pathPart = (separator === -1 ? path : path.slice(0, separator)).replace(/^\//, '');
  const inlineQuery = separator === -1 ? '' : path.slice(separator + 1);
  const hasFields = Object.keys(fields).length > 0;

  if (pathPart === '') {
    throw new ValidationError('API method path can not be empty');
  }

  if (!API_PATH.test(pathPart)) {
    throw new ValidationError(
      `API method path '${pathPart}' can only contain letters, digits, '/' and these characters: -._~!$&'()*+,;=:@`,
    );
  }

  // URL parsing resolves `.` and `..`, which would leave the app's API.
  if (pathPart.split('/').some((segment) => segment === '.' || segment === '..')) {
    throw new ValidationError(`API method path '${pathPart}' can not contain '.' or '..' segments`);
  }

  if (readInput && hasFields) {
    throw new ValidationError('--input can not be combined with --field or --typed-field');
  }

  const verb = method ? parseHttpMethod(method) : readInput ? 'POST' : 'GET';

  if (verb === 'GET' || verb === 'DELETE') {
    if (readInput) {
      throw new ValidationError('GET and DELETE requests carry no body. Pass --method POST, PUT or PATCH');
    }

    const query = [inlineQuery, toQuery(fields)].filter(Boolean).join('&');

    return { method: verb, path: pathPart, query, body: undefined };
  }

  return { method: verb, path: pathPart, query: inlineQuery, body: readInput ? readInput() : fields };
}

// Arrays keep the `[]` suffix unencoded: both Crowdin's query-to-body merge and Express read it as an array.
function toQuery(fields: Fields): string {
  return Object.entries(fields)
    .flatMap(([key, value]) =>
      Array.isArray(value)
        ? value.map((item) => `${encodeURIComponent(key)}[]=${encodeURIComponent(String(item))}`)
        : [`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`],
    )
    .join('&');
}
