export interface E2eEnv {
  /** Personal access token of the dedicated test account. */
  token: string | undefined;
  /** Crowdin Enterprise organization name; unset means crowdin.com. */
  organization: string | undefined;
  /** API base URL the suites write into every `crowdin.yml`, derived from `organization`. */
  baseUrl: string;
  /** When true, skip project/workspace cleanup for post-mortem debugging. */
  keep: boolean;
}

type EnvSource = Record<string, string | undefined>;

function resolveBaseUrl(organization: string | undefined): string {
  return organization ? `https://${organization}.api.crowdin.com` : 'https://api.crowdin.com';
}

export function resolveEnv(source: EnvSource = process.env): E2eEnv {
  const organization = source.CROWDIN_E2E_ORGANIZATION || undefined;

  return {
    token: source.CROWDIN_E2E_TOKEN || undefined,
    organization,
    baseUrl: resolveBaseUrl(organization),
    keep: source.CROWDIN_E2E_KEEP === '1',
  };
}
