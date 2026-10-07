// Prepares every package from one MailSchema commit and writes the UPSTREAM.md that records it
// for each language repository: npm run packages:upstream -- <commit>
// The checkout must be exactly that commit, with no changed, untracked or ignored file where
// preparation reads, so every file of every prepared package derives from it.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from '../src/map/core/index.ts';
import { packageArtifacts, packageArtifactPath } from '../src/lib/package-artifacts.ts';

const [commit] = process.argv.slice(2);
if (!/^[0-9a-f]{40}$/.test(commit ?? ''))
  throw new Error('Usage: npm run packages:upstream -- <full commit SHA>');
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
  'public/profiles',
  'specifications',
  'conformance',
  'scripts',
  'src',
).trim();
if (extra) throw new Error(`Preparation would read files outside ${commit}:\n${extra}`);
if (git('status', '--porcelain', '--untracked-files=no').trim())
  throw new Error('The checkout has tracked changes.');
execFileSync(process.execPath, ['scripts/prepare-packages.mjs'], { cwd: root, stdio: 'inherit' });

const versions = JSON.parse(readFileSync(resolve(root, 'packages/versions.json'), 'utf8'));
const packages = [
  ['npm', 'npm', 'npm', 'JavaScript package'],
  ['python', 'python/src', 'PyPI', 'Python package'],
  ['rust', 'rust', 'crates.io', 'Rust crate'],
  ['go', 'go', 'Go', 'Go module'],
  ['ruby', 'ruby', 'RubyGems', 'Ruby gem'],
];
for (const [directory, artifactRoot, registry, surface] of packages) {
  const lines = packageArtifacts.map((artifact) => {
    const path = packageArtifactPath(registry, artifact);
    const bytes = readFileSync(resolve(root, '.release/packages', artifactRoot, path));
    return `- ${artifact.name} (\`${path}\`): \`${sha256(bytes)}\``;
  });
  writeFileSync(
    resolve(root, '.release/packages', directory, 'UPSTREAM.md'),
    `# Release provenance

Version \`${versions[registry]}\` derives from [\`mailschema/mailschema@${commit.slice(0, 7)}\`](https://github.com/mailschema/mailschema/commit/${commit}). Its sources, tests and bundled files are prepared from that commit by \`npm run packages:prepare\`.

The bundled MAP 0.3 artifacts are exact copies of that commit's files and do not independently define MAP:

${lines.join('\n')}

The canonical artifacts live in the main MailSchema repository. This repository owns the ${surface} and its release history.
`,
  );
}
console.log(`Wrote UPSTREAM.md for every package from ${commit}.`);
