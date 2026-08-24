import type { Credentials } from '@crowdin/crowdin-api-client';

const CROWDIN_API_DOMAIN = 'api.crowdin.com';

/**
 * Extracts the Crowdin Enterprise organization name from a base URL, mirroring Java's
 * PropertiesBeanUtils.getOrganization. Returns undefined for the standard crowdin.com host.
 */
export function getOrganization(baseUrl: string): string | undefined {
  const organization = baseUrl
    .replace(/^https?:?\/?\/?/, '')
    .replace(/(\.?[^.]+)?\.?crowdin\.dev(\/api\/v2)?\/?$/, '')
    .replace(/\.?api\./g, '')
    .replace(/\.?crowdin\.com(\/api\/v2)?\/?$/, '')
    .replace(/.+\.test$/, '')
    .replace(/\.e-test$/, '');

  return organization.length === 0 ? undefined : organization;
}

/** Mirrors Java's PropertiesBeanUtils.isUrlForTesting: internal Crowdin dev/test hosts. */
export function isUrlForTesting(baseUrl: string): boolean {
  return (
    /^https:\/\/[^.]+\.crowdin\.dev(\/api\/v2)?$/.test(baseUrl) ||
    /^https:\/\/[^.]+\.[^.]+\.crowdin\.dev(\/api\/v2)?$/.test(baseUrl) ||
    /^https:\/\/.+\.test\.crowdin\.com(\/api\/v2)?$/.test(baseUrl) ||
    /^https:\/\/.+\.e-test\.crowdin\.com(\/api\/v2)?$/.test(baseUrl)
  );
}

/** The api domain a testing host carries; undefined elsewhere, where the client's default applies. */
function getApiDomain(baseUrl: string, organization: string | undefined): string | undefined {
  if (!isUrlForTesting(baseUrl)) {
    return undefined;
  }

  const host = baseUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  return organization ? host.replace(new RegExp(`^${organization}\\.`, 'i'), '') : host;
}

/**
 * Builds api-client credentials from a token + config base URL, mirroring Java's Clients.prepareClient.
 * For testing hosts the raw base URL is passed through (client uses it verbatim, so ensure /api/v2);
 * otherwise only the organization is passed and the client derives the standard URL.
 */
export function buildCredentials(token: string, baseUrl: string): Credentials {
  const organization = getOrganization(baseUrl);
  const apiDomain = getApiDomain(baseUrl, organization);

  return apiDomain ? { token, organization, apiDomain } : { token, organization };
}

/** The API root the client derives from these credentials, for the calls that bypass the client. */
export function buildApiUrl(baseUrl: string): string {
  const organization = getOrganization(baseUrl);
  const apiDomain = getApiDomain(baseUrl, organization) ?? CROWDIN_API_DOMAIN;

  return `https://${organization ? `${organization}.` : ''}${apiDomain}/api/v2`;
}
