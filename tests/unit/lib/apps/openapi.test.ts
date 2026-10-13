import { describe, expect, test } from 'bun:test';
import {
  arrayItemType,
  describeOperation,
  isOpenApiDocument,
  type OpenApiDocument,
  resolveRefs,
  schemaType,
  specUrlFromDocsUrl,
} from '@/lib/apps/openapi.ts';

const DOCS = 'https://x.app.crowdin.net/api-docs#tag/Files/operation/crowdin.update';

const spec: OpenApiDocument = {
  openapi: '3.0.0',
  paths: {
    '/crowdin-update': {
      post: {
        operationId: 'crowdin.update',
        parameters: [{ $ref: '#/components/parameters/ProjectId' }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateBody' } } },
        },
      },
    },
    '/settings': {
      parameters: [{ name: 'shared', in: 'query', schema: { type: 'string' } }],
      get: { parameters: [{ $ref: '#/components/parameters/ProjectId' }] },
    },
  },
  components: {
    parameters: {
      ProjectId: {
        name: 'projectId',
        in: 'query',
        required: true,
        description: 'Project',
        schema: { type: 'integer' },
      },
    },
    schemas: {
      UpdateBody: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'integer' },
          entryIds: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

describe('specUrlFromDocsUrl', () => {
  test.each([
    [DOCS, 'https://x.app.crowdin.net/api-docs/swagger.json'],
    ['https://x.app.crowdin.net/api-docs/#tag/x', 'https://x.app.crowdin.net/api-docs/swagger.json'],
    ['https://x.app.crowdin.net/docs?a=1', 'https://x.app.crowdin.net/docs/swagger.json'],
    ['/api-docs#x', null],
  ])('%p → %p', (docs, expected) => {
    expect(specUrlFromDocsUrl(docs)).toBe(expected);
  });
});

describe('isOpenApiDocument', () => {
  test.each([
    [{ openapi: '3.0.0', paths: {} }, true],
    [{ openapi: '3.1.0', paths: {} }, true],
    [{ swagger: '2.0', paths: {} }, false],
    [{ openapi: 3, paths: {} }, false],
    [{ openapi: '3.0.0' }, false],
    [{ paths: {} }, false],
    [[], false],
  ])('%p → %p', (value, expected) => {
    expect(isOpenApiDocument(value)).toBe(expected);
  });
});

describe('describeOperation', () => {
  test('finds the operation by the docs fragment and resolves refs', () => {
    expect(describeOperation(spec, { path: 'ignored', method: 'POST', documentationUrl: DOCS })).toEqual({
      operationId: 'crowdin.update',
      parameters: [
        { name: 'projectId', in: 'query', type: 'integer', itemType: null, required: true, description: 'Project' },
      ],
      requestBody: {
        type: 'object',
        required: ['projectId'],
        properties: { projectId: { type: 'integer' }, entryIds: { type: 'array', items: { type: 'string' } } },
      },
    });
  });

  test('ignores a fragment that points at another verb', () => {
    expect(
      describeOperation(spec, { path: 'settings', method: 'GET', documentationUrl: DOCS })?.operationId,
    ).toBeNull();
  });

  test('lets an operation parameter override a path-level one', () => {
    const overriding: OpenApiDocument = {
      openapi: '3.0.0',
      paths: {
        '/x': {
          parameters: [{ name: 'id', in: 'query', schema: { type: 'string' } }],
          get: { parameters: [{ name: 'id', in: 'query', required: true, schema: { type: 'integer' } }] },
        },
      },
    };

    expect(
      describeOperation(overriding, { path: 'x', method: 'GET', documentationUrl: 'https://x.test/d' })?.parameters,
    ).toEqual([{ name: 'id', in: 'query', type: 'integer', itemType: null, required: true, description: null }]);
  });

  test('falls back to path and verb, including path-level parameters', () => {
    const described = describeOperation(spec, {
      path: 'settings',
      method: 'GET',
      documentationUrl: 'https://x.app.crowdin.net/api-docs#tag/Settings/operation/unknown',
    });

    expect(described?.operationId).toBeNull();
    expect(described?.parameters.map((param) => param.name)).toEqual(['shared', 'projectId']);
    expect(described?.requestBody).toBeNull();
  });

  test('returns null when nothing matches', () => {
    expect(
      describeOperation(spec, { path: 'settings', method: 'POST', documentationUrl: 'https://x.test/d' }),
    ).toBeNull();
  });
});

describe('schemaType', () => {
  test.each([
    [{ type: 'string' }, 'string'],
    [{ type: ['string', 'null'] }, 'string|null'],
    [{ type: 'array', items: { type: 'string' } }, 'array<string>'],
    [{ type: 'array', items: { type: ['integer', 'null'] } }, 'array<integer|null>'],
    [{ type: ['array', 'null'], items: { type: 'string' } }, 'array<string>|null'],
    [{ type: 'string', nullable: true }, 'string|null'],
    [{ type: ['string', 'null'], nullable: true }, 'string|null'],
    [{ type: 'array', nullable: true, items: { type: 'integer', nullable: true } }, 'array<integer|null>|null'],
    [{ nullable: true }, 'any'],
    [{ type: 'string', nullable: false }, 'string'],
    [{ type: 'array' }, 'array'],
    [{ type: [] }, 'any'],
    [{}, 'any'],
    [undefined, 'any'],
  ])('%p → %p', (schema, expected) => {
    expect(schemaType(schema)).toBe(expected);
  });
});

describe('arrayItemType', () => {
  test.each([
    [{ type: 'array', items: { type: 'string' } }, 'string'],
    [{ type: 'array', items: { type: ['integer', 'null'] } }, 'integer|null'],
    [{ type: 'array', items: { type: 'integer', nullable: true } }, 'integer|null'],
    [{ type: ['array', 'null'], items: { type: 'string' } }, 'string'],
    [{ type: 'array' }, 'any'],
    [{ type: ['string', 'null'] }, null],
    [{ type: 'string' }, null],
    [undefined, null],
  ])('%p → %p', (schema, expected) => {
    expect(arrayItemType(schema)).toBe(expected);
  });
});

describe('resolveRefs', () => {
  test('stops at a cycle and keeps the pointer', () => {
    const cyclic = {
      components: {
        schemas: { Node: { type: 'object', properties: { child: { $ref: '#/components/schemas/Node' } } } },
      },
    };

    expect(resolveRefs({ $ref: '#/components/schemas/Node' }, cyclic)).toEqual({
      type: 'object',
      properties: { child: { $ref: '#/components/schemas/Node' } },
    });
  });

  test('keeps an unresolvable pointer', () => {
    expect(resolveRefs({ $ref: '#/missing' }, {})).toEqual({ $ref: '#/missing' });
  });

  test('keeps a pointer into another document', () => {
    expect(resolveRefs({ $ref: 'other.json#/components/schemas/X' }, {})).toEqual({
      $ref: 'other.json#/components/schemas/X',
    });
  });
});
