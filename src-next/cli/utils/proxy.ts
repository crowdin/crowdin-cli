// Mirrors the Java CLI's custom proxy env vars (BaseCli.HTTP_PROXY_*).
// Both host and port are required; port must be numeric (Java parity).
// Credentials are optional and only applied when both user and password are set.
export function proxyUrlFromEnv(): string | undefined {
  const host = process.env.HTTP_PROXY_HOST;
  const port = process.env.HTTP_PROXY_PORT;

  if (!host || !port || !/^\d+$/.test(port)) {
    return undefined;
  }

  const user = process.env.HTTP_PROXY_USER;
  const pass = process.env.HTTP_PROXY_PASSWORD;
  const auth = user && pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';

  return `http://${auth}${host}:${port}`;
}
