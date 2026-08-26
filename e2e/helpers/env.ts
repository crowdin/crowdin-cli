export interface E2eEnv {
  /** Personal access token of the dedicated test account. */
  token: string | undefined;
  /** When true, skip project/workspace cleanup for post-mortem debugging. */
  keep: boolean;
}

type EnvSource = Record<string, string | undefined>;

export function resolveEnv(source: EnvSource = process.env): E2eEnv {
  return {
    token: source.CROWDIN_E2E_TOKEN || undefined,
    keep: source.CROWDIN_E2E_KEEP === '1',
  };
}
