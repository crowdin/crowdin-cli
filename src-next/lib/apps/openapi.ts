import { isRecord } from '@/lib/utils/record.ts';
import type { ApiMethod } from './manifest.ts';

export type OpenApiDocument = Record<string, unknown> & { paths: Record<string, unknown> };

interface ApiParameter {
  name: string;
  in: string;
  type: string;
  /** The item type when the parameter is an array, else null. */
  itemType: string | null;
  required: boolean;
  description: string | null;
}

export interface JsonSchema {
  /** OpenAPI 3.1 allows a list of types, such as `['string', 'null']`. */
  type?: string | string[];
  /** OpenAPI 3.0's way to allow null. */
  nullable?: boolean;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  description?: string;
  default?: unknown;
  [key: string]: unknown;
}

export interface OperationDescription {
  operationId: string | null;
  parameters: ApiParameter[];
  requestBody: JsonSchema | null;
}

/** A manifest method plus what its OpenAPI operation adds; the spec fields are null without one. */
export type MethodDescription = ApiMethod & {
  specUrl: string | null;
  operationId: string | null;
  parameters: ApiParameter[] | null;
  requestBody: JsonSchema | null;
};

/** `https://x.app/api-docs#tag/Files/operation/crowdin.files` → `https://x.app/api-docs/swagger.json`. */
export function specUrlFromDocsUrl(documentationUrl: string): string | null {
  if (!URL.canParse(documentationUrl)) {
    return null;
  }

  const url = new URL(documentationUrl);

  return `${url.origin}${url.pathname.replace(/\/+$/, '')}/swagger.json`;
}

function operationIdFromDocsUrl(documentationUrl: string): string | null {
  const match = /(?:^|\/)operation\/([^/]+)$/.exec(new URL(documentationUrl).hash.slice(1));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** OpenAPI 3 only: Swagger 2 declares bodies and parameter types in shapes the description does not read. */
export function isOpenApiDocument(value: unknown): value is OpenApiDocument {
  return isRecord(value) && String(value.openapi).startsWith('3.') && isRecord(value.paths);
}

/** Finds the operation by the docs URL's operationId first, then by path and verb. */
export function describeOperation(
  spec: OpenApiDocument,
  { path, method, documentationUrl }: { path: string; method: string; documentationUrl: string },
): OperationDescription | null {
  const found =
    findByOperationId(spec, operationIdFromDocsUrl(documentationUrl), method) ?? findByPath(spec, path, method);

  if (!found) {
    return null;
  }

  const operation = resolveRefs(found.operation, spec) as Record<string, unknown>;
  // An operation parameter overrides a path-level one with the same name and location.
  const byLocation = new Map<string, ApiParameter>();

  for (const list of [resolveRefs(found.pathItem.parameters, spec), operation.parameters]) {
    for (const parameter of (Array.isArray(list) ? list : []).filter(isRecord).map(toParameter)) {
      byLocation.set(`${parameter.in}:${parameter.name}`, parameter);
    }
  }

  const parameters = [...byLocation.values()];
  const content = isRecord(operation.requestBody) ? operation.requestBody.content : undefined;
  const json = isRecord(content) ? content['application/json'] : undefined;
  const schema = isRecord(json) && isRecord(json.schema) ? (json.schema as JsonSchema) : null;

  return {
    operationId: typeof operation.operationId === 'string' ? operation.operationId : null,
    parameters,
    requestBody: schema,
  };
}

/**
 * `array<string>` for typed arrays, the plain type otherwise, `any` when the schema names none. A list of types
 * joins with `|`: `string|null`, `array<integer|null>`; so does OpenAPI 3.0's `nullable`.
 */
export function schemaType(schema: JsonSchema | undefined): string {
  const types = typeNames(schema);
  const items = typeNames(schema?.items).join('|');

  if (types.length === 0) {
    return 'any';
  }

  return types.map((type) => (type === 'array' && items ? `array<${items}>` : type)).join('|');
}

/** The item type of an array schema, `any` when it names none; null for anything but an array. */
export function arrayItemType(schema: JsonSchema | undefined): string | null {
  return typeNames(schema).includes('array') ? typeNames(schema?.items).join('|') || 'any' : null;
}

function typeNames(schema: JsonSchema | undefined): string[] {
  const types = schema?.type === undefined ? [] : [schema.type].flat();
  return schema?.nullable === true && types.length > 0 && !types.includes('null') ? [...types, 'null'] : types;
}

/** Inlines every local `$ref`; a pointer back into its own chain stays a `$ref` so cycles terminate. */
export function resolveRefs(value: unknown, spec: unknown, chain: string[] = []): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => resolveRefs(item, spec, chain));
  }

  if (!isRecord(value)) {
    return value;
  }

  if (typeof value.$ref === 'string') {
    const ref = value.$ref;
    const target = chain.includes(ref) ? undefined : resolvePointer(spec, ref);

    return target === undefined ? { $ref: ref } : resolveRefs(target, spec, [...chain, ref]);
  }

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveRefs(item, spec, chain)]));
}

function resolvePointer(spec: unknown, ref: string): unknown {
  if (!ref.startsWith('#/')) {
    return undefined;
  }

  return ref
    .slice(2)
    .split('/')
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce<unknown>((node, segment) => (isRecord(node) ? node[segment] : undefined), spec);
}

// A docs link pointing at another verb's operation is a manifest mistake; the path lookup decides then.
function findByOperationId(spec: OpenApiDocument, operationId: string | null, method: string) {
  if (!operationId) {
    return undefined;
  }

  for (const pathItem of Object.values(spec.paths).filter(isRecord)) {
    const operation = pathItem[method.toLowerCase()];

    if (isRecord(operation) && operation.operationId === operationId) {
      return { pathItem, operation };
    }
  }

  return undefined;
}

function findByPath(spec: OpenApiDocument, path: string, method: string) {
  const pathItem = spec.paths[`/${path}`];
  const operation = isRecord(pathItem) ? pathItem[method.toLowerCase()] : undefined;

  return isRecord(pathItem) && isRecord(operation) ? { pathItem, operation } : undefined;
}

function toParameter(parameter: Record<string, unknown>): ApiParameter {
  const schema = isRecord(parameter.schema) ? (parameter.schema as JsonSchema) : undefined;

  return {
    name: String(parameter.name ?? ''),
    in: String(parameter.in ?? ''),
    type: schemaType(schema),
    itemType: arrayItemType(schema),
    required: parameter.required === true,
    description: typeof parameter.description === 'string' ? parameter.description : null,
  };
}
