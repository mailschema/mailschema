// Prepares the Ruby gem from one MailSchema commit and writes the UPSTREAM.md that
// records it for mailschema/ruby: npm run packages:ruby-upstream -- <commit> <output>
// The checkout must be exactly that commit, with no changed, untracked or ignored file
// where preparation reads, so every file of the prepared gem derives from it.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [commit, output] = process.argv.slice(2);
if (!/^[0-9a-f]{40}$/.test(commit ?? '') || !output)
  throw new Error('Usage: npm run packages:ruby-upstream -- <full commit SHA> <output path>');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' });
if (git('rev-parse', 'HEAD').trim() !== commit)
  throw new Error(`The checkout is not at ${commit}.`);
// Preparation copies whole directories, so untracked and ignored files count too.
const extra = git(
  'status',
  '--porcelain',
  '--ignored',
  '--untracked-files=all',
  '--',
  'packages',
  'public',
  'conformance',
  'registry',
  'scripts',
  'src',
).trim();
if (extra) throw new Error(`Preparation would read files outside ${commit}:\n${extra}`);
if (git('status', '--porcelain', '--untracked-files=no').trim())
  throw new Error('The checkout has tracked changes.');
execFileSync(process.execPath, ['scripts/prepare-packages.mjs'], { cwd: root, stdio: 'inherit' });

const gem = resolve(root, '.release/packages/ruby');
const version = /VERSION = "([^"]+)"/.exec(
  readFileSync(resolve(gem, 'lib/mailschema/version.rb'), 'utf8'),
)[1];
// Every file the gem bundles, as the one package manifest lists them.
const manifest = JSON.parse(readFileSync(resolve(root, 'packages/artifacts.json'), 'utf8'));
const artifacts = manifest.artifacts
  .filter((artifact) => artifact.paths.RubyGems)
  .map((artifact) => [artifact.name, artifact.paths.RubyGems]);
const lines = artifacts.map(([name, path]) => {
  const sha = createHash('sha256')
    .update(readFileSync(resolve(gem, path)))
    .digest('hex');
  return `- ${name} (\`${path}\`): \`${sha}\``;
});
writeFileSync(
  resolve(output),
  `# Release provenance

Version \`${version}\` derives from [\`mailschema/mailschema@${commit.slice(0, 7)}\`](https://github.com/mailschema/mailschema/commit/${commit}): the gem source, its tests and fixtures, and the bundled files are prepared from that commit by \`npm run packages:prepare\`.

The bundled files are exact projections of that source commit and do not independently define MAP:

${lines.join('\n')}

The canonical schemas live in the main MailSchema repository. This repository owns the Ruby gem surface and its release history.
`,
);
console.log(`Wrote ${resolve(output)} for ${commit}.`);
