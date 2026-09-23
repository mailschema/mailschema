import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import release from '../docs/releases/0.1.0.json' with { type: 'json' };
import current from '../docs/releases/current.json' with { type: 'json' };
import {
  assertPackageRelease,
  assertPackageSet,
  type PackageRelease,
  type PackageSetSelection,
} from '../src/lib/package-release';
import { tooling, recordCheckCommands } from '../src/data/tooling';
import { typeRecords } from '../src/data/types';
import { assertTypeRecord } from '../src/registry/validation';

test('advertised tooling refuses schema drift and unverified or mixed releases', () => {
  const schema = readFileSync('public/schemas/contribution.schema.json', 'utf8');
  expect(() => assertPackageRelease(release, schema)).not.toThrow();
  expect(
    assertPackageSet(
      current as PackageSetSelection,
      new Map([['0.1.0', release as PackageRelease]]),
      schema,
    ).size,
  ).toBe(3);
  expect(() => assertPackageRelease(release, schema + '\n')).toThrow(/differs from the advertised/);
  for (const alteration of [
    { status: 'submitted' },
    { version: '9.9.9' },
    { url: 'https://example.com/package' },
  ]) {
    const changed = structuredClone(release);
    Object.assign(changed.channels[0], alteration);
    expect(() => assertPackageRelease(changed, schema)).toThrow();
  }
  const wrongSelection = structuredClone(current);
  wrongSelection.channels[0].version = '9.9.9';
  expect(() =>
    assertPackageSet(
      wrongSelection as PackageSetSelection,
      new Map([['0.1.0', release as PackageRelease]]),
      schema,
    ),
  ).toThrow(/not verified/);
});

test('language tabs restore deep links and support keyboard navigation and exact copying', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          (window as any).copiedCode = text;
        },
      },
    });
  });
  await page.goto('/tools/#python');
  const python = page.getByRole('tab', { name: 'Python PyPI' });
  await expect(python).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await expect(page.locator('#python')).toContainText(tooling[1].install);
  await python.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Rust crates.io' })).toBeFocused();
  await expect(page.locator('#rust')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(page.locator('#javascript')).toBeVisible();
  await expect(page).toHaveURL(/#javascript$/);
  const panel = page.locator('#javascript');
  await expect(panel.getByRole('link', { name: `npm · ${release.version}` })).toHaveAttribute(
    'href',
    release.channels[0].url,
  );
  await panel.getByRole('button', { name: 'Copy Install', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).copiedCode)).toBe(tooling[0].install);
  await expect(panel.getByRole('button', { name: 'Copy Install', exact: true })).toContainText(
    'Copied',
  );
  await panel.getByRole('button', { name: 'Copy check-contribution.mjs', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).copiedCode)).toBe(tooling[0].example);
  await page.reload();
  await expect(page.locator('#javascript')).toBeVisible();
});

test('clipboard failure leaves selectable code with feedback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async () => {
          throw new Error('Denied');
        },
      },
    });
  });
  await page.goto('/tools/');
  const panel = page.locator('#javascript');
  await panel.getByRole('button', { name: 'Copy Install', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Copy Install', exact: true })).toContainText(
    'Selected',
  );
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(tooling[0].install);
  await expect(panel.getByRole('status').first()).toContainText('Automatic copying is unavailable');
});

test('record downloads work directly with validators and retain existing digest exports', async ({
  page,
  request,
}) => {
  for (const type of typeRecords) {
    await page.goto(`/registry/${type.slug}/`);
    const link = page.getByRole('link', { name: 'Download record', exact: true });
    await expect(link).toHaveAttribute('download', `${type.slug}.json`);
    const record = await (await request.get((await link.getAttribute('href'))!)).json();
    expect(() => assertTypeRecord(record)).not.toThrow();
    expect(record).toEqual(type);
    const envelope = await (await request.get(`/registry/records/${type.slug}.json`)).json();
    expect(envelope.record).toEqual(record);
    expect(envelope.digest).toMatch(/^[a-f0-9]{64}$/);
    await expect(page.getByRole('link', { name: 'Validate this record' })).toHaveAttribute(
      'href',
      '/tools/#records',
    );
  }
  await page.goto('/tools/#records');
  await expect(page.locator('#records')).toContainText(recordCheckCommands.javascript);
});

test('tooling remains readable without JavaScript and is linked from the contribution flow and reader', async ({
  browser,
  page,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await staticPage.goto('http://127.0.0.1:49327/tools/');
  for (const tool of tooling) {
    await expect(staticPage.locator(`#${tool.id}`)).toBeVisible();
    await expect(staticPage.locator(`#${tool.id}`)).toContainText(tool.install);
  }
  await expect(staticPage.locator('[data-copy-code]:visible')).toHaveCount(0);
  await context.close();
  await page.goto('/contribute/');
  await page.getByRole('link', { name: 'Prefer to validate locally?' }).click();
  await expect(page).toHaveURL(/#local-validation$/);
  await expect(page.locator('#local-validation')).toContainText(tooling[0].command!);
  await page.getByRole('link', { name: 'Installation and API reference' }).click();
  await expect(page).toHaveURL(/\/tools\/$/);
  await page.goto('/search/?q=Python');
  await page
    .locator('[data-search]:visible')
    .getByRole('heading', { name: 'Python package' })
    .click();
  await expect(page.locator('#python')).toBeVisible();
  await page.goto('/specification/');
  await expect(page.getByRole('link', { name: 'Registry tools', exact: true })).toBeVisible();
});
