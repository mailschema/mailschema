import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import current from '../docs/releases/current.json' with { type: 'json' };
import {
  assertPackageRelease,
  assertPackageSet,
  type PackageContracts,
  type PackageRelease,
  type PackageSetSelection,
} from '../src/lib/package-release';
import { packageArtifactNames, packageContractBytes } from '../src/lib/package-artifacts';
import { tooling, localCheckCommands, recordCheckCommands, rubyTool } from '../src/data/tooling';
import { typeRecords } from '../src/data/types';
import { assertTypeRecord } from '../src/registry/validation';

const contracts = packageContractBytes() as PackageContracts;
const releases = new Map<string, PackageRelease>(
  current.channels.map(({ evidence }) => [
    evidence,
    JSON.parse(readFileSync(`docs/releases/${evidence}.json`, 'utf8')) as PackageRelease,
  ]),
);
const selected = assertPackageSet(current as PackageSetSelection, releases, contracts);
const npmRelease = selected.get('npm')!;

test('the Tools page offers exactly the selected releases, with Ruby once RubyGems is selected', () => {
  expect(tooling.map((tool) => tool.registry).sort()).toEqual(
    current.channels.map((channel) => channel.registry).sort(),
  );
  // Each tab's MAP version is the core schema its release evidence binds.
  expect(tooling.map((tool) => tool.map)).toEqual(tooling.map(() => '0.1'));
  const ruby = rubyTool(
    {
      registry: 'RubyGems',
      name: 'mailschema',
      version: '0.2.0',
      url: 'https://rubygems.org/gems/mailschema/versions/0.2.0',
      status: 'verified',
    },
    '0.2',
  );
  expect([ruby.id, ruby.map, ruby.install]).toEqual([
    'ruby',
    '0.2',
    'gem install mailschema -v 0.2.0',
  ]);
});

test('advertised tooling refuses schema drift and unverified or mixed releases', () => {
  for (const release of releases.values())
    expect(() => assertPackageRelease(release, contracts)).not.toThrow();
  expect([...assertPackageSet(current as PackageSetSelection, releases, contracts).keys()]).toEqual(
    current.channels.map((channel) => channel.registry),
  );
  expect(() =>
    assertPackageRelease(releases.get(current.channels[0].evidence)!, {
      ...contracts,
      contribution: contracts.contribution + '\n',
    }),
  ).toThrow(/differs from the advertised/);
  for (const alteration of [
    { status: 'submitted' },
    { version: '9.9.9' },
    { url: 'https://example.com/package' },
  ]) {
    const changed = structuredClone(releases.get(current.channels[0].evidence)!);
    Object.assign(changed.channels[0], alteration);
    expect(() => assertPackageRelease(changed, contracts)).toThrow();
  }
  const wrongSelection = structuredClone(current);
  wrongSelection.channels[0].version = '9.9.9';
  expect(() =>
    assertPackageSet(wrongSelection as PackageSetSelection, releases, contracts),
  ).toThrow(/not verified/);
});

test('full-contract release evidence binds every distributed protocol schema', () => {
  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  const release: PackageRelease = {
    format: 'mailschema-package-release/2',
    version: '1.0.0',
    schemaSha256: hash(contracts.contribution),
    contracts: packageArtifactNames('npm').map((name) => ({
      name,
      sha256: hash(contracts[name as keyof PackageContracts]),
    })),
    channels: [
      {
        registry: 'npm',
        name: 'mailschema',
        version: '1.0.0',
        url: 'https://www.npmjs.com/package/mailschema/v/1.0.0',
        status: 'verified',
      },
    ],
  };

  expect(() => assertPackageRelease(release, contracts)).not.toThrow();
  expect(() =>
    assertPackageRelease(release, { ...contracts, 'map-0.1': `${contracts['map-0.1']}\n` }),
  ).toThrow(/map-0.1 contract differs/);
  const missing = structuredClone(release);
  missing.contracts!.pop();
  expect(() => assertPackageRelease(missing, contracts)).toThrow(/Invalid release contract set/);
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
  await page.goto('/tools#python');
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
  await expect(panel.getByRole('link', { name: `npm · ${npmRelease.version}` })).toHaveAttribute(
    'href',
    npmRelease.url,
  );
  await panel.getByRole('button', { name: 'Copy Install', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).copiedCode)).toBe(tooling[0].install);
  await expect(panel.getByRole('button', { name: 'Copy Install', exact: true })).toContainText(
    'Copied',
  );
  await panel.getByRole('button', { name: 'Copy check-description.mjs', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).copiedCode)).toBe(tooling[0].example);
  await page.reload();
  await expect(page.locator('#javascript')).toBeVisible();
});

test('the tab strip never widens a small screen, whatever the number of releases', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('/tools');
  // A promotion adds a tab; the Ruby tab is the longest that can join the four.
  await page.evaluate(() => {
    const tabs = document.querySelector('[data-tool-tabs]')!;
    const tab = tabs.lastElementChild!.cloneNode(true) as HTMLElement;
    tab.querySelector('span')!.textContent = 'Ruby';
    tab.querySelector('small')!.textContent = 'RubyGems';
    tabs.append(tab);
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
  await page.goto('/tools');
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
    await page.goto(`/registry/${type.slug}`);
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
      '/tools#records',
    );
  }
  await page.goto('/tools#records');
  await expect(page.locator('#records')).toContainText(recordCheckCommands.javascript);
});

test('tooling remains readable without JavaScript and is linked from the contribution flow and reader', async ({
  browser,
  page,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await staticPage.goto('http://127.0.0.1:49327/tools');
  for (const tool of tooling) {
    await expect(staticPage.locator(`#${tool.id}`)).toBeVisible();
    await expect(staticPage.locator(`#${tool.id}`)).toContainText(tool.install);
  }
  await expect(staticPage.locator('[data-copy-code]:visible')).toHaveCount(0);
  await context.close();
  await page.goto('/contribute');
  await page.getByRole('link', { name: 'Prefer to validate locally?' }).click();
  await expect(page).toHaveURL(/#local-validation$/);
  await expect(page.locator('#local-validation')).toContainText(localCheckCommands.javascript);
  await page.getByRole('link', { name: 'Installation and API reference' }).click();
  await expect(page).toHaveURL(/\/tools$/);
  await page.goto('/search?q=Python');
  await page
    .locator('[data-search]:visible')
    .getByRole('heading', { name: 'Python package' })
    .click();
  await expect(page.locator('#python')).toBeVisible();
  await page.goto('/specification');
  await expect(page.getByRole('link', { name: 'Registry tools', exact: true })).toBeVisible();
});
