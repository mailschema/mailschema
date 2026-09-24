# Reader reference

Captured from the Sourcey-rendered MailSchema reader after adopting the exact public `sourcey@3.6.8` release on 24 September 2026. Six chapters at 1440 × 1000 and 390 × 844, full page, Playwright 1.63.0 Chromium, reduced motion and loaded local fonts. These baselines include the shared responsive frame that aligns the masthead, reader navigation and document content, along with the complete linked “Docs by Sourcey” attribution, northeast arrows on external reader links and MailSchema-owned sidebar content.

These are the current-content regression references. The approved chapter rewrites, date and navigation changes intentionally changed pixels and page heights. The preceding references and their passing report are preserved in `pre-language-pass/`, together with the comparison showing the copy changes before this refresh. The previous README is retained there as a historical record.

The subsequent Tools integration changed 3,141 raw pixels per desktop chapter, confined to the main header (1,773) and reader sidebar links (1,368). Article pixels, all page dimensions and all mobile captures were unchanged. The references before this navigation update, their passing report, the navigation comparison and changed-region coordinates are preserved in `pre-tools/`. The current references incorporate these intended links.

The public Sourcey release changed external-link treatments in the desktop sidebars and the footer attribution at both widths. The MailSchema status pass also changed copy and page height in Overview, Interaction model, Results and retries, and Interoperability. `sourcey-3.6.6-comparison.json` records the comparison against the preceding baseline. The replacement captures were inspected at desktop and mobile widths before acceptance.

Sourcey 3.6.7 aligned the header, sidebar and document content to one responsive frame. `sourcey-3.6.7-comparison.json` records that intentional layout change against the 3.6.6 baseline. The current references incorporate the accepted alignment.

Sourcey 3.6.8 made the complete “Docs by Sourcey” attribution one link with normal word spacing. `sourcey-3.6.8-comparison.json` records the isolated footer change against the 3.6.7 baseline. The current references incorporate the corrected attribution.

Run `npm run test:visual` against the production preview. Acceptance requires identical dimensions and zero raw RGBA pixel differences. Pixelmatch uses a 0.1 colour threshold only for the supplementary diff visualization.
