import type { ApplicationsModel } from '@crowdin/crowdin-api-client';
import { colors } from '@/cli/utils/colors.ts';
import type { View } from '@/cli/utils/output.ts';
import type { ApiMethod } from '@/lib/apps/manifest.ts';
import { arrayItemType, type JsonSchema, type MethodDescription, schemaType } from '@/lib/apps/openapi.ts';

export interface DryRunRequest {
  method: string;
  url: string;
  body: unknown;
}

export const appView: View<ApplicationsModel.Application> = {
  text: (app) => `${colors.yellow(app.identifier)} ${colors.green(app.name)}`,
  plain: (app) => app.identifier,
  keys: ['identifier', 'name'],
};

export const appVerboseView: View<ApplicationsModel.Application> = {
  ...appView,
  text: (app) => [appView.text(app), projectScope(app.permissions), app.baseUrl].filter(Boolean).join(' '),
  keys: ['identifier', 'name', 'baseUrl', 'permissions'],
};

const methodLine = (method: ApiMethod) =>
  `${colors.yellow(method.method)} ${colors.green(method.path)}  ${method.name}`;

export const methodView: View<ApiMethod> = {
  text: methodLine,
  plain: (method) => `${method.method} ${method.path}`,
  keys: ['method', 'path', 'name', 'description'],
};

export const methodVerboseView: View<ApiMethod> = {
  ...methodView,
  text: (method) =>
    [`${methodLine(method)}${method.description ? `: ${method.description}` : ''}`, method.documentationUrl]
      .filter(Boolean)
      .join(' '),
  keys: ['method', 'path', 'name', 'description', 'key', 'documentationUrl'],
};

export function createMethodDescriptionView(app: string): View<MethodDescription> {
  return {
    text: (described) => {
      const lines = [methodLine(described)];
      const body = bodyFields(described.requestBody);

      if (described.description) {
        lines.push(described.description);
      }

      if (described.documentationUrl) {
        lines.push(`Docs: ${described.documentationUrl}`);
      }

      if (described.parameters?.length) {
        lines.push(
          'Parameters:',
          ...alignRows(
            described.parameters.map((param) => [
              param.name,
              param.in,
              param.type,
              param.required ? 'required' : '',
              firstSentence(param.description ?? ''),
            ]),
          ),
        );
      }

      if (body.length) {
        lines.push(
          'Body (application/json):',
          ...alignRows(body.map((field) => [field.name, field.type, field.required ? 'required' : '', field.note])),
        );
      }

      lines.push('Example:', `  ${exampleCommand(app, described)}`);

      return lines.join('\n');
    },
    plain: (described) =>
      [
        `${described.method} ${described.path}`,
        ...(described.parameters ?? []).map(
          (param) => `param ${param.name} ${param.in} ${param.type} ${param.required ? 'required' : 'optional'}`,
        ),
        ...bodyFields(described.requestBody).map(
          (field) => `body ${field.name} ${field.type} ${field.required ? 'required' : 'optional'}`,
        ),
      ].join('\n'),
    keys: [
      'method',
      'path',
      'name',
      'description',
      'key',
      'documentationUrl',
      'specUrl',
      'operationId',
      'parameters',
      'requestBody',
    ],
  };
}

/** The app's result document as it came back: indented for text, one line for plain. */
export const rawJsonView: View<unknown> = {
  text: (value) => JSON.stringify(value, null, 2),
  plain: (value) => JSON.stringify(value),
};

export const dryRunView: View<DryRunRequest> = {
  text: (request) =>
    [
      `${request.method} ${request.url}`,
      ...(request.body === null ? [] : ['Body:', JSON.stringify(request.body, null, 2)]),
    ].join('\n'),
  plain: (request) => `${request.method} ${request.url}`,
};

/** The copyable `app api` line: required query fields for reads, required body fields for writes. */
function exampleCommand(app: string, described: MethodDescription): string {
  const isRead = described.method === 'GET' || described.method === 'DELETE';
  const query = (described.parameters ?? []).filter((param) => param.required && param.in === 'query');
  const body = bodyFields(described.requestBody).filter((field) => field.required);
  // Writes send fields in the body, so a query parameter the body does not repeat goes in the inline query.
  const inlineQuery = isRead ? [] : query.filter((param) => !body.some((field) => field.name === param.name));
  const path = inlineQuery.length
    ? `'${described.path}?${inlineQuery.map(fieldPlaceholder).join('&')}'`
    : described.path;
  const parts = ['crowdin app api', app, path];

  if (described.method !== 'GET') {
    parts.push('-X', described.method);
  }

  for (const field of isRead ? query : body) {
    parts.push(`-F '${fieldPlaceholder(field)}'`);
  }

  return parts.join(' ');
}

function fieldPlaceholder(field: { name: string; type: string; itemType: string | null }): string {
  return field.itemType === null ? `${field.name}=<${field.type}>` : `${field.name}[]=<${field.itemType}>`;
}

function bodyFields(schema: JsonSchema | null) {
  const required = schema?.required ?? [];

  return Object.entries(schema?.properties ?? {}).map(([name, property]) => ({
    name,
    type: schemaType(property),
    itemType: arrayItemType(property),
    required: required.includes(name),
    note: [
      firstSentence(property.description ?? ''),
      property.default !== undefined ? `default ${JSON.stringify(property.default)}` : '',
    ]
      .filter(Boolean)
      .join(', '),
  }));
}

// A table cell keeps the first sentence; the full text stays in json/toon.
function firstSentence(text: string): string {
  const [first = text] = text.split(/(?<=\.)\s/);
  return first === text ? text : `${first.replace(/\.$/, '')}…`;
}

function alignRows(rows: string[][]): string[] {
  const widths = rows[0]?.map((_, column) => Math.max(...rows.map((row) => row[column]?.length ?? 0))) ?? [];
  return rows.map((row) => `  ${row.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join('  ')}`.trimEnd());
}

function projectScope(permissions: ApplicationsModel.ApplicationPermissions | undefined): string {
  const project = permissions?.project;

  if (!project) {
    return '';
  }

  return project.value === 'restricted' ? `(projects: ${project.ids.join(', ')})` : '(all projects)';
}
