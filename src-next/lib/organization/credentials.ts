import type { Credentials } from '@crowdin/crowdin-api-client';

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

/**
 * Builds api-client credentials from a token + config base URL, mirroring Java's Clients.prepareClient.
 * For testing hosts the raw base URL is passed through (client uses it verbatim, so ensure /api/v2);
 * otherwise only the organization is passed and the client derives the standard URL.
 */
export function buildCredentials(token: string, baseUrl: string): Credentials {
  const organization = getOrganization(baseUrl);

  if (isUrlForTesting(baseUrl)) {
    const host = baseUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const apiDomain = organization ? host.replace(new RegExp(`^${organization}\\.`, 'i'), '') : host;

    return { token, organization, apiDomain };
  }

  return { token, organization };
}
