import { test, expect } from '@playwright/test';
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
