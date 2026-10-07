const canonicalHost = 'mailschema.org';

// Superseded published artifacts keep their bytes and say so: a Deprecation date for the
// profile that superseded them and, where one exists, the artifact that replaced each.
const map01 = {
  deprecation: '@1790812800',
  successors: new Map([
    ['/profiles/map/0.1.json', '/profiles/map/0.2.json'],
    ['/contexts/map-0.1.jsonld', '/contexts/map-0.2.jsonld'],
    ['/schemas/map-0.1.schema.json', '/schemas/map-0.2.schema.json'],
    ['/schemas/type-contract-0.1.schema.json', '/schemas/type-contract-0.2.schema.json'],
    ['/contracts/content-review-0.1.json', '/contracts/content-review-0.2.json'],
    ['/schemas/content-review-0.1.schema.json', '/schemas/content-review-0.2.schema.json'],
    ['/contracts/content-review-0.2.json', '/contracts/content-review-0.3.json'],
    ['/schemas/content-review-0.2.schema.json', '/schemas/content-review-0.3.schema.json'],
  ]),
  superseded: (pathname) => pathname.startsWith('/fixtures/map-0.1/'),
  successor: '/profiles/map/0.2.json',
};
const map02 = {
  deprecation: '@1791331200',
  successors: new Map([
    ['/profiles/map/0.2.json', '/profiles/map/0.3.json'],
    ['/contexts/map-0.2.jsonld', '/contexts/map-0.3.jsonld'],
    ['/schemas/map-0.2.schema.json', '/artifacts/map-0.3/schemas/core.schema.json'],
    ['/schemas/type-contract-0.2.schema.json', '/artifacts/map-0.3/schemas/contract.schema.json'],
    ['/registry/catalog.json', '/registry/map-0.3.json'],
  ]),
  // MAP 0.3 publishes under /artifacts/map-0.3/, so these paths hold only earlier material,
  // most of it without a single replacement.
  superseded: (pathname) =>
    /^\/(?:schemas|contracts|contribution-examples)\//.test(pathname) ||
    pathname.startsWith('/fixtures/map-0.2/') ||
    /^\/registry\/(?:records|contributions|snapshots)\//.test(pathname),
  successor: undefined,
};

/** The superseded artifact's Deprecation date and successor, if the path names one. */
function superseded(pathname) {
  for (const generation of [map01, map02]) {
    const successor = generation.successors.get(pathname);
    if (successor) return { deprecation: generation.deprecation, successor };
    if (generation.superseded(pathname))
      return { deprecation: generation.deprecation, successor: generation.successor };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    // Every page has one address without a trailing slash; a slash link resolves in one
    // permanent hop.
    const canonical = new URL(url);
    if (!local && (url.protocol !== 'https:' || url.hostname === `www.${canonicalHost}`)) {
      canonical.protocol = 'https:';
      canonical.hostname = canonicalHost;
    }
    canonical.pathname = canonical.pathname.replace(/(?<=.)\/+$/, '');
    if (canonical.pathname === '/types' || canonical.pathname.startsWith('/types/'))
      canonical.pathname = `/registry${canonical.pathname.slice('/types'.length)}`;
    // A profile identifier resolves to its published record.
    if (/^\/profiles\/map\/\d+\.\d+$/.test(canonical.pathname)) canonical.pathname += '.json';
    if (canonical.href !== url.href) return Response.redirect(canonical, 308);

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
    headers.set('Strict-Transport-Security', 'max-age=31536000');
    const archived = response.ok ? superseded(url.pathname) : undefined;
    if (archived) {
      headers.set('Deprecation', archived.deprecation);
      if (archived.successor)
        headers.append(
          'Link',
          `<https://${canonicalHost}${archived.successor}>; rel="successor-version"`,
        );
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (url.pathname.startsWith('/og/'))
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    else if (url.pathname.startsWith('/specification/_og/'))
      headers.set('Cache-Control', 'public, max-age=86400');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
