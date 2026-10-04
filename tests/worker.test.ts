import { expect, test } from 'vitest';
import worker from '../worker.js';

const assets = {
  fetch: async (request: Request) => new Response(new URL(request.url).pathname),
};

const serve = (url: string) => worker.fetch(new Request(url), { ASSETS: assets });

test('redirects every non-canonical address in one permanent hop', async () => {
  for (const [requested, canonical] of [
    [
      'https://mailschema.org/specification/profile/',
      'https://mailschema.org/specification/profile',
    ],
    ['https://mailschema.org/search/?q=approval', 'https://mailschema.org/search?q=approval'],
    [
      'http://www.mailschema.org/registry/content-review/',
      'https://mailschema.org/registry/content-review',
    ],
    ['http://mailschema.org/', 'https://mailschema.org/'],
    ['https://mailschema.org/types', 'https://mailschema.org/registry'],
    [
      'http://www.mailschema.org/types/campaign-send-approval/?from=email',
      'https://mailschema.org/registry/campaign-send-approval?from=email',
    ],
  ]) {
    const response = await serve(requested);
    expect(response.status, requested).toBe(308);
    expect(response.headers.get('location'), requested).toBe(canonical);
  }
});

test('serves canonical addresses from the assets with security headers', async () => {
  for (const url of ['https://mailschema.org/', 'https://mailschema.org/registry/content-review']) {
    const response = await serve(url);
    expect(response.status, url).toBe(200);
    expect(await response.text(), url).toBe(new URL(url).pathname);
    expect(response.headers.get('x-content-type-options'), url).toBe('nosniff');
  }
});

test('serves immutable MAP 0.1 artifacts with deprecation and successor metadata', async () => {
  for (const [path, successor] of [
    ['/profiles/map/0.1.json', '/profiles/map/0.2.json'],
    ['/schemas/type-contract-0.1.schema.json', '/schemas/type-contract-0.2.schema.json'],
    ['/contracts/content-review-0.1.json', '/contracts/content-review-0.2.json'],
    ['/contracts/content-review-0.2.json', '/contracts/content-review-0.3.json'],
    ['/fixtures/map-0.1/approve.json', '/profiles/map/0.2.json'],
  ]) {
    const response = await serve(`https://mailschema.org${path}`);
    expect(response.headers.get('deprecation'), path).toBe('@1790812800');
    expect(response.headers.get('link'), path).toBe(
      `<https://mailschema.org${successor}>; rel="successor-version"`,
    );
    expect(response.headers.get('cache-control'), path).toBe('public, max-age=31536000, immutable');
  }
});
