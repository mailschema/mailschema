import { test, expect } from '@playwright/test';
import { typeRecords, typeHref, typeStatusLabel } from '../src/data/types';

test('type collection stays consistent across Types, Registry, detail pages, About and search', async ({
  page,
}) => {
  const names = typeRecords.map((type) => type.name);
  const summaries = typeRecords.map((type) => type.summary);
  expect(
    new Set(typeRecords.map((type) => type.slug)).size,
    'Type identifiers must be unique',
  ).toBe(typeRecords.length);
  expect(new Set(names).size, 'Type names must be unique').toBe(typeRecords.length);

  await page.goto('/types/');
  await expect(page.locator('[data-type-summary] h2')).toHaveText(names);
  await expect(page.locator('[data-type-summary] [data-type-description]')).toHaveText(summaries);
  for (const type of typeRecords) {
    const entry = page.locator(`[data-type-summary="${type.slug}"]`);
    await expect(entry).toHaveAttribute('href', typeHref(type.slug));
    await expect(entry.locator('[data-type-status]')).toHaveText(typeStatusLabel(type));
    await expect(entry.locator('[data-type-operations] li')).toHaveText(
      type.operations.map((operation) => operation.name),
    );
    await expect(entry.locator('.type-example')).toContainText(type.example.title);
  }

  await page.goto('/registry/');
  await expect(page.locator('[data-type-record] h2')).toHaveText(names);
  await expect(page.locator('[data-type-description]')).toHaveText(summaries);
  for (const type of typeRecords) {
    const entry = page.locator(`.registry-record[href="${typeHref(type.slug)}"]`);
    await expect(entry.locator('.registry-status .pill')).toHaveText(type.status);
    await expect(entry.locator('.registry-version')).toContainText(type.version || 'Not assigned');
  }

  await page.goto('/search/');
  for (const type of typeRecords) {
    const entry = page.locator(`.search-result[href="${typeHref(type.slug)}"]`);
    await expect(entry.locator('h2')).toHaveText(type.name);
    await expect(entry.locator('p')).toHaveText(`${type.summary} ${typeStatusLabel(type)}.`);
  }

  await page.goto('/about/');
  for (const type of typeRecords) {
    const link = page.locator(`.prose a[href="${typeHref(type.slug)}"]`);
    await expect(link).toHaveText(type.name);
    await expect(link.locator('..')).toContainText(type.status);
  }

  for (const type of typeRecords) {
    await page.goto(typeHref(type.slug));
    await expect(page.locator('main h1')).toHaveText(type.name);
    await expect(page.locator('.page-hero .lead')).toHaveText(type.summary);
    await expect(page.locator('[data-type-status]')).toHaveText(typeStatusLabel(type));
    await expect(page.locator('.type-operations dt')).toHaveText(
      type.operations.map((operation) => operation.name),
    );
    await expect(page.locator('#example')).toHaveText(type.example.title);
    await expect(page.locator('#example + ol li')).toHaveText(type.example.steps);
  }
});

test('linked specification definitions agree with their type records', async ({ page }) => {
  for (const type of typeRecords) {
    if (type.status === 'Draft') {
      expect(type.version, `${type.name} needs a definition version`).toBeTruthy();
      expect(type.definition, `${type.name} needs a maintained definition`).toBeTruthy();
    }
    if (!type.definition) continue;
    const response = await page.goto(type.definition.href);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main h1')).toHaveText(type.name);
    await expect(page.locator('.doc-title p')).toHaveText(type.summary);
    for (const operation of type.operations) {
      await expect(
        page.locator('.reader-prose').getByRole('heading', { name: operation.name, exact: true }),
      ).toBeVisible();
    }
  }
});
