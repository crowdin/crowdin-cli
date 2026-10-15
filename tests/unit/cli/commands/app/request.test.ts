import { describe, expect, test } from 'bun:test';
import { buildApiRequest } from '@/cli/commands/app/request.ts';
import ValidationError from '@/cli/errors/ValidationError.ts';

describe('buildApiRequest', () => {
  test('defaults to GET, even with fields', () => {
    const request = buildApiRequest({ path: 'settings', fields: { projectId: 12 } });
    expect(request).toEqual({ method: 'GET', path: 'settings', query: 'projectId=12', body: undefined });
  });

  test('defaults to POST when --input is given', () => {
    const request = buildApiRequest({ path: 'x', fields: {}, readInput: () => ({ a: 1 }) });
    expect(request).toEqual({ method: 'POST', path: 'x', query: '', body: { a: 1 } });
  });

  test('accepts the method in any case', () => {
    expect(buildApiRequest({ path: 'x', method: 'patch', fields: {} }).method).toBe('PATCH');
  });

  test('rejects an unknown method', () => {
    expect(() => buildApiRequest({ path: 'x', method: 'HEAD', fields: {} })).toThrow(ValidationError);
  });

  test('puts fields in the body for writes and sends {} without any', () => {
    expect(buildApiRequest({ path: 'x', method: 'POST', fields: { projectId: 12, ids: ['a'] } }).body).toEqual({
      projectId: 12,
      ids: ['a'],
    });
    expect(buildApiRequest({ path: 'x', method: 'PUT', fields: {} }).body).toEqual({});
  });

  test('serializes query arrays with the [] suffix and stringifies scalars', () => {
    const request = buildApiRequest({
      path: 'jobs',
      method: 'DELETE',
      fields: { ids: ['a', 'b c'], flag: true, none: null },
    });

    expect(request.query).toBe('ids[]=a&ids[]=b%20c&flag=true&none=null');
  });

  test('merges the inline query with fields and strips one leading slash', () => {
    const request = buildApiRequest({ path: '/job-info?projectId=12', fields: { jobId: 'j1' } });
    expect(request).toMatchObject({ path: 'job-info', query: 'projectId=12&jobId=j1' });
  });

  test('keeps the inline query on writes', () => {
    const request = buildApiRequest({ path: 'x?projectId=1', method: 'POST', fields: { a: 'b' } });
    expect(request).toMatchObject({ query: 'projectId=1', body: { a: 'b' } });
  });

  test.each([['../projects/1'], ['a/./b'], ['..']])('rejects the dot segments in %p', (path) => {
    expect(() => buildApiRequest({ path, fields: {} })).toThrow(
      new ValidationError(`API method path '${path}' can not contain '.' or '..' segments`),
    );
  });

  test.each([
    ['..\t/..\t/projects/12'],
    ['.\n./x'],
    ['.\r./x'],
    ['x/.. '],
    ['..#'],
    ['%2e%2E/x'],
    ['..%2f..%2fprojects'],
    ['%252e%252e/x'],
    ['a\\..\\b'],
    ['x/\u2024\u2024'],
  ])('rejects the characters URL parsing would reshape in %p', (path) => {
    expect(() => buildApiRequest({ path, fields: {} })).toThrow(/can only contain letters, digits/);
  });

  test('allows RFC 3986 path characters', () => {
    const path = "a-z_0.9~!$&'()*+,;=:@/x";
    expect(buildApiRequest({ path, fields: {} }).path).toBe(path);
  });

  test('leaves the inline query unchecked', () => {
    expect(buildApiRequest({ path: 'x?q=a%20b#c', fields: {} }).query).toBe('q=a%20b#c');
  });

  test('allows dots inside a segment', () => {
    expect(buildApiRequest({ path: 'v1.2/..x', fields: {} }).path).toBe('v1.2/..x');
  });

  test('rejects an empty path', () => {
    expect(() => buildApiRequest({ path: '/?a=1', fields: {} })).toThrow(
      new ValidationError('API method path can not be empty'),
    );
  });

  test('rejects --input on GET and DELETE without reading it', () => {
    const readInput = () => {
      throw new Error('read');
    };

    for (const method of ['GET', 'DELETE']) {
      expect(() => buildApiRequest({ path: 'x', method, fields: {}, readInput })).toThrow(
        new ValidationError('GET and DELETE requests carry no body. Pass --method POST, PUT or PATCH'),
      );
    }
  });

  test('rejects --input together with fields', () => {
    expect(() => buildApiRequest({ path: 'x', fields: { a: '1' }, readInput: () => ({}) })).toThrow(ValidationError);
  });
});
