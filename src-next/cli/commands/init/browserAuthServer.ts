import { decodeJwt } from 'jose';
import CliError from '@/cli/errors/CliError.ts';

const CROWDIN_OAUTH_CLIENT_ID = 'wQEqvhU3vLOa2XicmUyT';
const CROWDIN_OAUTH_HOST = 'localhost';
const CROWDIN_OAUTH_PORT = 46221;
const AUTHORIZATION_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export interface BrowserAuthorization {
  accessToken: string;
  domain: string | null;
}

export function getAuthorizationUrl(): string {
  return (
    `https://accounts.crowdin.com/oauth/authorize?` +
    `client_id=${CROWDIN_OAUTH_CLIENT_ID}&` +
    `redirect_uri=http://${CROWDIN_OAUTH_HOST}:${CROWDIN_OAUTH_PORT}/callback&` +
    `response_type=token&` +
    `scope=project`
  );
}

// Spins up a throwaway localhost server and resolves once the browser redirects back to /callback
// with an access token. The caller opens the OAuth page (getAuthorizationUrl). Stops after one callback.
export function startBrowserAuthorization(timeoutMs = AUTHORIZATION_TIMEOUT_MS): Promise<BrowserAuthorization> {
  return new Promise<BrowserAuthorization>((resolve, reject) => {
    let server: ReturnType<typeof Bun.serve>;
    let timeout: ReturnType<typeof setTimeout>;

    try {
      server = Bun.serve({
        port: CROWDIN_OAUTH_PORT,
        hostname: CROWDIN_OAUTH_HOST,
        fetch(req) {
          const url = new URL(req.url);

          if (url.pathname === '/callback') {
            const params = url.searchParams;
            const accessToken = params.get('access_token');
            const error = params.get('error');

            clearTimeout(timeout);
            server.stop();

            if (accessToken) {
              const payload = decodeJwt(accessToken);
              const domain = typeof payload.domain === 'string' ? payload.domain : null;

              resolve({ accessToken, domain });

              return new Response(authenticationPage('You have successfully authenticated.'), {
                headers: { 'Content-Type': 'text/html' },
              });
            }

            reject(new Error(error || 'Unknown error'));

            return new Response(authenticationPage('Something went wrong.'), {
              headers: { 'Content-Type': 'text/html' },
            });
          }

          return new Response('<h1 style="text-align: center">404 Not Found!</h1>', {
            status: 404,
            headers: { 'Content-Type': 'text/html' },
          });
        },
      });
    } catch {
      reject(
        new CliError(
          `Port ${CROWDIN_OAUTH_PORT} is already in use, so browser authorization can't start. ` +
            'Free the port or re-run with --token to paste an API token instead.',
          1,
          true,
        ),
      );
      return;
    }

    timeout = setTimeout(() => {
      server.stop();
      reject(
        new CliError(
          'Timed out waiting for browser authorization. Re-run with --token to paste an API token instead.',
          1,
          true,
        ),
      );
    }, timeoutMs);
  });
}

function authenticationPage(mainText: string): string {
  return (
    `<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap" rel="stylesheet"> ` +
    `<style>* { font-family: 'Open Sans', sans-serif; }</style> ` +
    `<title>Crowdin CLI - Authentication</title><br/><br/><br/>` +
    `<div><h1 style='text-align: center;'>${mainText}</h1>` +
    `<p style='text-align: center;'>You may now close this page.</p></div>`
  );
}
