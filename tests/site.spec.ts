import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { typeRecords } from '../src/data/types';
import { searchEntries } from '../src/data/site';
const routes = [
  '/',
  '/specification/',
  '/specification/profile/',
  '/specification/interaction-model/',
  '/specification/content-review/',
  '/specification/authorization/',
  '/specification/outcomes/',
  '/specification/interoperability/',
  '/types/',
  '/registry/',
  ...typeRecords.map((type) => `/registry/${type.slug}/`),
  '/examples/',
  '/about/',
  '/contribute/',
  '/tools/',
  '/search/',
];

test('every public route and internal destination resolves', async ({ page, request }) => {
  const targets = new Set<string>();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator('main h1')).toHaveCount(1);
    const links = await page
      .locator('a[href]')
      .evaluateAll((anchors) =>
        anchors
          .map((a) => (a as HTMLAnchorElement).href)
          .filter((href) => new URL(href).origin === location.origin),
      );
    links.forEach((href) => targets.add(new URL(href, `http://127.0.0.1:49327${route}`).href));
  }
  for (const target of targets) {
    const url = new URL(target);
    const response = await request.get(url.pathname);
    expect(response.status(), target).toBe(200);
    if (url.hash)
      expect(await response.text(), target).toContain(
        `id="${decodeURIComponent(url.hash.slice(1))}"`,
      );
  }
  expect(errors).toEqual([]);
});

test('production metadata uses the public origin and exposes a sitemap', async ({
  page,
  request,
}) => {
  await page.goto('/tools/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://mailschema.org/tools/',
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    'https://mailschema.org/tools/',
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://mailschema.org/og/mailschema-v1.png',
  );
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    'content',
    'MailSchema. Email agents can act on.',
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );
  const socialImage = await request.get('/og/mailschema-v1.png');
  expect(socialImage.status()).toBe(200);
  expect(socialImage.headers()['content-type']).toBe('image/png');
  expect((await socialImage.body()).byteLength).toBeGreaterThan(40_000);
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap: https://mailschema.org/sitemap-index.xml');
  const sitemap = await request.get('/sitemap-index.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain('https://mailschema.org/');
});

test('review decisions bind the exact revision and permission', async ({ page }) => {
  await page.goto('/examples/');
  const result = page.locator('[data-result]');
  const demo = page.locator('[data-review-demo]');
  const quote = page.locator('[data-quote]');
  const original = await quote.textContent();
  await page.getByLabel('Act as').selectOption('reader');
  await page.getByRole('button', { name: 'Approve revision 3' }).click();
  await expect(result).toContainText('No decision was recorded');
  await expect(demo).toHaveAttribute('data-status', 'waiting');
  await page.getByLabel('Act as').selectOption('reviewer');
  await page.getByRole('button', { name: 'Request changes', exact: true }).click();
  await page.getByLabel('What needs to change?').fill('Add the timezone.');
  await page.getByRole('button', { name: 'Submit feedback' }).click();
  await expect(result).toContainText('feedback for revision 3');
  await expect(page.locator('[data-state-description]')).toContainText(
    'content has not changed yet',
  );
  await expect(quote).toHaveText(original!);
  await page.getByRole('button', { name: 'Create revision 4' }).click();
  await expect(result).toContainText('No edit was made');
  await expect(demo).toHaveAttribute('data-status', 'feedback');
  await expect(quote).toHaveText(original!);
  await page.getByLabel('Act as').selectOption('editor');
  await page.getByRole('button', { name: 'Create revision 4' }).click();
  await expect(quote).toContainText('9am Sydney time');
  await page.getByRole('button', { name: 'Approve revision 4' }).click();
  await expect(result).toContainText('No decision was recorded');
  await expect(demo).toHaveAttribute('data-status', 'waiting');
  await page.getByLabel('Act as').selectOption('reviewer');
  await page.getByRole('button', { name: 'Try a stale approval' }).click();
  await expect(result).toContainText('refers to revision 3');
  await expect(result).toContainText('current draft is revision 4');
  await expect(demo).toHaveAttribute('data-status', 'waiting');
  await page.getByRole('button', { name: 'Approve revision 4' }).click();
  await expect(result).toContainText('Sending the campaign requires separate permission');
  await expect(page.locator('[data-state-title]')).toHaveText('Revision 4 approved.');
  await expect(page.getByRole('button', { name: 'Approve revision 4' })).toBeDisabled();
  await page.getByRole('button', { name: 'Reset example' }).click();
  await expect(page.getByRole('button', { name: 'Approve revision 3' })).toBeEnabled();
  await expect(quote).toHaveText(original!);
});

test('feedback validation, cancellation, subsequent revisions and tab keyboard behavior', async ({
  page,
}) => {
  await page.goto('/examples/');
  await page.getByRole('tab', { name: 'The email', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'The interaction' })).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'The interaction' })).toBeVisible();
  for (const revision of [4, 5]) {
    await page.getByLabel('Act as').selectOption('reviewer');
    await page.getByRole('button', { name: 'Request changes', exact: true }).click();
    await page.getByLabel('What needs to change?').fill('   ');
    await page.getByRole('button', { name: 'Submit feedback' }).click();
    await expect(page.locator('[data-review-demo]')).toHaveAttribute('data-status', 'waiting');
    await page.getByLabel('What needs to change?').fill('Make the opening specific.');
    await page.getByRole('button', { name: 'Submit feedback' }).click();
    await page.getByLabel('Act as').selectOption('editor');
    await page.getByRole('button', { name: `Create revision ${revision}` }).click();
    await expect(page.getByRole('button', { name: `Approve revision ${revision}` })).toBeVisible();
  }
  await page.getByLabel('Act as').selectOption('reviewer');
  await page.getByRole('button', { name: 'Request changes', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Request changes', exact: true })).toBeFocused();
});

test('search handles query URLs, no results and clearing', async ({ page }) => {
  await page.goto('/search/?q=authorization');
  await expect(page.locator('.search-result:visible')).toHaveCount(1);
  await expect(page.locator('.search-result:visible')).toContainText('Authorization');
  await page.getByRole('searchbox').fill('<script>unknown</script>');
  await expect(page.getByText('No matching pages.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.locator('.search-result:visible')).toHaveCount(searchEntries.length);
  await expect(page.getByRole('searchbox')).toBeFocused();
  for (const [query, href] of [
    ['information request', '/registry/information-request/'],
    ['content review', '/registry/content-review/'],
  ]) {
    await page.goto(`/search/?q=${encodeURIComponent(query)}`);
    await expect(page.locator(`.search-result[href="${href}"]`)).toBeVisible();
  }
});

test('type registry combines filters, restores query URLs and clears empty results', async ({
  page,
}) => {
  const records = page.locator('[data-type-record]:visible');
  await page.goto('/registry/?status=Reuse%20assessment');
  await expect(records).toHaveCount(
    typeRecords.filter((type) => type.status === 'Reuse assessment').length,
  );
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('Reuse assessment');
  await page.getByLabel('Category', { exact: true }).selectOption('Calendar');
  await expect(records).toHaveCount(1);
  await expect(records).toContainText('Event Response');
  await page.reload();
  await expect(records).toHaveCount(1);
  await expect(page.getByLabel('Category', { exact: true })).toHaveValue('Calendar');
  await page.getByLabel('Find a type', { exact: true }).fill('information');
  await expect(records).toHaveCount(0);
  await expect(page.getByText('No types match these filters.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(records).toHaveCount(typeRecords.length);
  await expect(page).toHaveURL(/\/registry\/$/);
  await expect(page.getByLabel('Find a type', { exact: true })).toBeFocused();
  await page.getByLabel('Find a type', { exact: true }).fill('  content   review ');
  await expect(records).toHaveCount(1);
  await expect(page.locator('[data-registry-count]')).toHaveText('1 type');
  await records.getByRole('link').click();
  await expect(page).toHaveURL(/\/registry\/content-review\/$/);
  await expect(
    page.getByRole('link', { name: 'Read the Content Review definition' }),
  ).toHaveAttribute('href', '/specification/content-review/');
});

test('old type links redirect and the former product-directory record is removed', async ({
  page,
  request,
}) => {
  await page.goto('/types/content-review/');
  await expect(page).toHaveURL(/\/registry\/content-review\/$/);
  expect((await request.get('/registry/sourcey/')).status()).toBe(404);
});

test('mobile pages fit, navigation and chapter selection work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of routes) {
    await page.goto(route);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      route,
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('/');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeHidden();
  for (const route of ['/types/', '/registry/', '/registry/subscription-preferences/', '/tools/']) {
    await page.goto(route);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      route,
    ).toBeTruthy();
  }
  await page.goto('/specification/');
  await page.getByLabel('Specification chapter').selectOption({ label: 'Authorization' });
  await expect(page).toHaveURL(/authorization/);
  await expect(
    page.getByRole('heading', { name: 'Authorization', exact: true, level: 1 }),
  ).toBeVisible();
});

test('key surfaces meet automated WCAG AA checks', async ({ page }) => {
  for (const route of [
    '/',
    '/specification/',
    '/types/',
    '/registry/',
    '/registry/content-review/',
    '/registry/subscription-preferences/',
    '/examples/',
    '/search/',
    '/contribute/',
    '/tools/',
  ]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        help: v.help,
        nodes: v.nodes.map((n) => n.target),
      })),
      route,
    ).toEqual([]);
  }
});

test('reading works without JavaScript and the example is honest', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:49327/specification/');
  await expect(page.getByRole('heading', { name: 'An interaction', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByText('Chapters', { exact: true }).click();
  await page
    .locator('.reader-chapter-fallback')
    .getByRole('link', { name: 'Authorization' })
    .click();
  await expect(page.getByRole('heading', { name: 'Authorization', level: 1 })).toBeVisible();
  await page.goto('http://127.0.0.1:49327/examples/');
  await expect(page.getByRole('button', { name: 'Approve revision 3' })).toBeDisabled();
  await expect(
    page.getByText('Enable JavaScript to try the local example.', { exact: false }),
  ).toBeVisible();
  await page.goto('http://127.0.0.1:49327/registry/');
  await expect(page.locator('[data-type-record]:visible')).toHaveCount(typeRecords.length);
  await expect(page.locator('#registry-filters')).toBeHidden();
  await page.locator('[data-type-record]').getByRole('link').first().click();
  await expect(page.getByRole('heading', { name: 'Content Review', level: 1 })).toBeVisible();
  await context.close();
});

test('Sourcey owns the reader and publishes its specification indexes', async ({
  page,
  request,
}) => {
  await page.goto('/specification/');
  await expect(page.locator('meta[name="generator"]')).toHaveAttribute('content', /^Sourcey /);
  await expect(page.locator('body')).toHaveAttribute('data-sourcey-theme', 'reader');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://mailschema.org/specification/_og/static.png',
  );
  expect((await request.get('/specification/_og/static.png')).status()).toBe(200);
  const attribution = page.locator('.sourcey-attribution');
  await expect(attribution).toHaveText('Docs by Sourcey');
  await expect(attribution.getByRole('link', { name: 'Sourcey' })).toHaveAttribute(
    'href',
    'https://sourcey.com',
  );
  await expect(attribution.getByRole('link', { name: 'Sourcey' }).locator('svg')).toHaveCount(1);
  const index = await (await request.get('/specification/search-index.json')).json();
  const pages = [...new Set(index.map((entry: { url: string }) => entry.url.split('#')[0]))];
  expect(pages.sort()).toEqual(
    routes.filter((route) => route.startsWith('/specification/')).sort(),
  );
  const machineText = await request.get('/specification/llms-full.txt');
  expect(machineText.status()).toBe(200);
  expect(await machineText.text()).toContain('Mail Action Protocol');
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.locator('[data-copy-page]')).toContainText(/Copied|Copy the address bar URL/);
});
