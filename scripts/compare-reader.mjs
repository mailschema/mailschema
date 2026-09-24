import { chromium } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const reference = process.env.READER_REFERENCE_DIR || resolve('tests/visual-reference');
const base = process.env.READER_BASE_URL || 'http://127.0.0.1:49328';
const output = resolve('test-results/reader-comparison');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ reducedMotion: 'reduce' });
const chapters = [
  '',
  'interaction-model',
  'content-review',
  'authorization',
  'outcomes',
  'interoperability',
];
const results = [];
try {
  for (const [size, width, height] of [
    ['desktop', 1440, 1000],
    ['mobile', 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const chapter of chapters) {
      const name = `${chapter || 'overview'}-${size}`;
      await page.goto(`${base}/specification${chapter ? `/${chapter}` : ''}`);
      await page.evaluate(() => document.fonts.ready);
      const actualBytes = await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
      const actual = PNG.sync.read(actualBytes);
      const expected = PNG.sync.read(await readFile(`${reference}/${name}.png`));
      const dimensionsMatch = actual.width === expected.width && actual.height === expected.height;
      const heightToCompare = Math.max(actual.height, expected.height);
      const pad = (image) => {
        const canvas = new PNG({ width, height: heightToCompare });
        PNG.bitblt(image, canvas, 0, 0, image.width, image.height, 0, 0);
        return canvas;
      };
      const diff = new PNG({ width, height: heightToCompare });
      const changed = pixelmatch(
        pad(expected).data,
        pad(actual).data,
        diff.data,
        width,
        heightToCompare,
        { threshold: 0.1 },
      );
      await writeFile(`${output}/${name}-diff.png`, PNG.sync.write(diff));
      let rawChangedPixels = 0;
      if (dimensionsMatch)
        for (let i = 0; i < actual.data.length; i += 4) {
          if (
            [0, 1, 2, 3].some((channel) => actual.data[i + channel] !== expected.data[i + channel])
          )
            rawChangedPixels++;
        }
      results.push({
        rawChangedPixels,
        name,
        dimensionsMatch,
        expectedHeight: expected.height,
        actualHeight: actual.height,
        changedPixels: changed,
        changedPercent: +((changed * 100) / (width * heightToCompare)).toFixed(4),
      });
    }
  }
} finally {
  await browser.close();
}
await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
console.table(results);
if (results.some((result) => !result.dimensionsMatch || result.rawChangedPixels > 0))
  process.exitCode = 1;
