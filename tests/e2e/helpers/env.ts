export interface E2eEnv {
  /** Personal access token of the dedicated test account. */
  token: string | undefined;
  /**
   * API base URL, written into every `crowdin.yml` and used for the harness's own API client:
   * `https://api.crowdin.com` (the default) or an Enterprise `https://<org>.api.crowdin.com`.
   */
  baseUrl: string;
  /** When true, skip project/workspace cleanup for post-mortem debugging. */
  keep: boolean;
}

type EnvSource = Record<string, string | undefined>;

export function resolveEnv(source: EnvSource = process.env): E2eEnv {
  return {
    token: source.CROWDIN_E2E_TOKEN || undefined,
    baseUrl: source.CROWDIN_E2E_BASE_URL || 'https://api.crowdin.com',
    keep: source.CROWDIN_E2E_KEEP === '1',
  };
}
