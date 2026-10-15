import { isRecord } from '@/lib/utils/record.ts';

export interface ApiMethod {
  method: string;
  path: string;
  name: string;
  description: string | null;
  key: string;
  documentationUrl: string | null;
}

export type Manifest = Record<string, unknown>;

/** The manifest's `modules.api` entries in manifest order; a manifest without them declares none. */
export function parseApiMethods(manifest: Manifest, baseUrl: string): ApiMethod[] {
  const modules = isRecord(manifest.modules) ? manifest.modules.api : undefined;

  if (!Array.isArray(modules)) {
    return [];
  }

  return modules.filter(isRecord).flatMap((entry) => {
    if (typeof entry.url !== 'string' || typeof entry.method !== 'string') {
      return [];
    }

    return [
      {
        method: entry.method.toUpperCase(),
        path: normalizeApiPath(entry.url),
        name: typeof entry.name === 'string' ? entry.name : '',
        description: typeof entry.description === 'string' ? entry.description : null,
        key: typeof entry.key === 'string' ? entry.key : '',
        documentationUrl:
          typeof entry.documentationUrl === 'string' ? absoluteUrl(entry.documentationUrl, baseUrl) : null,
      },
    ];
  });
}

export function findMethodsByPath(methods: ApiMethod[], path: string): ApiMethod[] {
  const wanted = normalizeApiPath(path);
  return methods.filter((method) => method.path === wanted);
}

function normalizeApiPath(path: string): string {
  return path.replace(/^\//, '');
}

function absoluteUrl(url: string, baseUrl: string): string {
  if (URL.canParse(url) || !baseUrl) {
    return url;
  }

  return `${baseUrl.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}
