# Reader reference

Captured from the Sourcey-rendered MailSchema reader after the approved language pass and Tools navigation integration on 23 September 2026. Six chapters at 1440 × 1000 and 390 × 844, full page, Playwright 1.63.0 Chromium, reduced motion and loaded local fonts. These baselines include the plain-text Sourcey attribution and MailSchema-owned sidebar content.

These are the current-content regression references. The approved chapter rewrites, date and navigation changes intentionally changed pixels and page heights. The preceding references and their passing report are preserved in `pre-language-pass/`, together with the comparison showing the copy changes before this refresh. The previous README is retained there as a historical record.

The subsequent Tools integration changed 3,141 raw pixels per desktop chapter, confined to the main header (1,773) and reader sidebar links (1,368). Article pixels, all page dimensions and all mobile captures were unchanged. The references before this navigation update, their passing report, the navigation comparison and changed-region coordinates are preserved in `pre-tools/`. The current references incorporate these intended links.

The current references were refreshed from the same Sourcey renderer after inspecting desktop and mobile layouts. They do not independently prove renderer migration parity; the content update did not change the Sourcey package. Run `npm run test:visual` against the production preview. Acceptance requires identical dimensions and zero raw RGBA pixel differences. Pixelmatch uses a 0.1 colour threshold only for the supplementary diff visualization.
