const canonicalHost = 'mailschema.org';
const map01Deprecation = '@1790812800';
const map01Successors = new Map([
  ['/profiles/map/0.1.json', '/profiles/map/0.2.json'],
  ['/contexts/map-0.1.jsonld', '/contexts/map-0.2.jsonld'],
  ['/schemas/map-0.1.schema.json', '/schemas/map-0.2.schema.json'],
  ['/schemas/type-contract-0.1.schema.json', '/schemas/type-contract-0.2.schema.json'],
  ['/contracts/content-review-0.1.json', '/contracts/content-review-0.2.json'],
  ['/schemas/content-review-0.1.schema.json', '/schemas/content-review-0.2.schema.json'],
  ['/contracts/content-review-0.2.json', '/contracts/content-review-0.3.json'],
  ['/schemas/content-review-0.2.schema.json', '/schemas/content-review-0.3.schema.json'],
]);

const map01Successor = (pathname) =>
  map01Successors.get(pathname) ??
  (pathname.startsWith('/fixtures/map-0.1/') ? '/profiles/map/0.2.json' : undefined);

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
    if (canonical.href !== url.href) return Response.redirect(canonical, 308);

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
    headers.set('Strict-Transport-Security', 'max-age=31536000');
    const successor = response.ok ? map01Successor(url.pathname) : undefined;
    if (successor) {
      headers.set('Deprecation', map01Deprecation);
      headers.append('Link', `<https://${canonicalHost}${successor}>; rel="successor-version"`);
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
