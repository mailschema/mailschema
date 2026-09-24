const canonicalHost = 'mailschema.org';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    // Every page has one address without a trailing slash. Earlier slash links,
    // including the published MAP 0.1 profile's, resolve in one permanent hop.
    const canonical = new URL(url);
    if (!local && (url.protocol !== 'https:' || url.hostname === `www.${canonicalHost}`)) {
      canonical.protocol = 'https:';
      canonical.hostname = canonicalHost;
    }
    canonical.pathname = canonical.pathname.replace(/(?<=.)\/+$/, '');
    if (canonical.href !== url.href) return Response.redirect(canonical, 308);

    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
    headers.set('Strict-Transport-Security', 'max-age=31536000');
    if (url.pathname.startsWith('/og/'))
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
