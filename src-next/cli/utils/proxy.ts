// Proxy from the HTTP_PROXY_HOST/PORT/USER/PASSWORD env vars.
// Both host and port are required; port must be numeric.
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
