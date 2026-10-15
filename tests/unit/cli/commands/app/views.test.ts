import { describe, expect, test } from 'bun:test';
import { createMethodDescriptionView } from '@/cli/commands/app/views.ts';
import type { MethodDescription } from '@/lib/apps/openapi.ts';

const jobsMethod = (method: string): MethodDescription => ({
  method,
  path: 'jobs',
  name: 'Jobs',
  description: null,
  key: 'jobs',
  documentationUrl: null,
  specUrl: null,
  operationId: null,
  parameters: [
    { name: 'projectId', in: 'query', type: 'integer', itemType: null, required: true, description: null },
    { name: 'tags', in: 'query', type: 'array<string>', itemType: 'string', required: true, description: null },
    { name: 'entryId', in: 'query', type: 'string', itemType: null, required: true, description: null },
    { name: 'limit', in: 'query', type: 'integer', itemType: null, required: false, description: null },
  ],
  requestBody: { type: 'object', required: ['entryId'], properties: { entryId: { type: 'string' } } },
});

const example = (described: MethodDescription) =>
  createMethodDescriptionView('my-app').text(described).split('\n').at(-1)?.trim();

describe('method description example', () => {
  test('puts required query parameters the body does not repeat in the inline query on writes', () => {
    expect(example(jobsMethod('POST'))).toBe(
      "crowdin app api my-app 'jobs?projectId=<integer>&tags[]=<string>' -X POST -F 'entryId=<string>'",
    );
  });

  test('sends required query parameters as fields on reads', () => {
    expect(example(jobsMethod('GET'))).toBe(
      "crowdin app api my-app jobs -F 'projectId=<integer>' -F 'tags[]=<string>' -F 'entryId=<string>'",
    );
  });

  test('renders OpenAPI 3.1 type lists in the text report', () => {
    const text = createMethodDescriptionView('my-app').text({
      ...jobsMethod('POST'),
      parameters: [
        { name: 'tag', in: 'query', type: 'string|null', itemType: null, required: false, description: null },
      ],
      requestBody: {
        type: 'object',
        required: ['ids'],
        properties: {
          ids: { type: ['array', 'null'], items: { type: ['integer', 'null'] } },
          note: { type: ['string', 'null'] },
        },
      },
    });

    expect(text).toContain('  ids   array<integer|null>|null  required');
    expect(text).toContain('  note  string|null');
    expect(text).toContain("-F 'ids[]=<integer|null>'");
  });
});
