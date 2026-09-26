import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { materializePackageArtifacts } from '../src/lib/package-artifacts.ts';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageName = 'mailschema';
const userAgent = 'MailSchema release verifier (https://mailschema.org)';
const order = ['npm', 'PyPI', 'crates.io', 'Go', 'RubyGems'];
const slugs = { npm: 'npm', PyPI: 'pypi', 'crates.io': 'crates', Go: 'go', RubyGems: 'rubygems' };

function parseArguments(argv) {
  const args = { promote: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--promote') args.promote = true;
    else if (argument === '--registry') args.registry = argv[++index];
    else if (argument === '--version') args.version = argv[++index];
    else if (argument === '--help') args.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return args;
}

function usage() {
  return `Verify a published MailSchema package against the canonical schema.

Usage:
  node scripts/promote-package.mjs --registry <npm|PyPI|crates.io|Go|RubyGems> --version <x.y.z>
  node scripts/promote-package.mjs --registry <registry> --version <x.y.z> --promote

Without --promote, the command performs public registry readback without changing files.
With --promote, it writes immutable evidence and updates docs/releases/current.json.`;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function verifyIntegrity(bytes, integrity) {
  if (!integrity) return;
  const candidates = integrity.split(/\s+/).filter(Boolean);
  const matched = candidates.some((candidate) => {
    const separator = candidate.indexOf('-');
    if (separator < 1) return false;
    const algorithm = candidate.slice(0, separator);
    const expected = candidate.slice(separator + 1).split('?')[0];
    if (!['sha256', 'sha384', 'sha512'].includes(algorithm)) return false;
    return createHash(algorithm).update(bytes).digest('base64') === expected;
  });
  if (!matched) throw new Error('Downloaded npm artifact does not match its published integrity.');
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': userAgent },
  });
  if (!response.ok) throw new Error(`Registry request failed (${response.status}): ${url}`);
  return response.json();
}

async function download(url) {
  const response = await fetch(url, { headers: { 'user-agent': userAgent }, redirect: 'follow' });
  if (!response.ok) throw new Error(`Artifact download failed (${response.status}): ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

function command(command, args, input) {
  return execFileSync(command, args, { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024, input });
}

function tarEntry(archive, suffix) {
  const entries = command('tar', ['-tzf', archive]).toString('utf8').split('\n').filter(Boolean);
  const matches = entries.filter((entry) => entry.endsWith(suffix));
  if (matches.length !== 1)
    throw new Error(`Expected one ${suffix} in ${basename(archive)}, found ${matches.length}.`);
  return command('tar', ['-xOzf', archive, matches[0]]);
}

function zipEntry(archive, suffix) {
  const entries = command('unzip', ['-Z1', archive]).toString('utf8').split('\n').filter(Boolean);
  const matches = entries.filter((entry) => entry.endsWith(suffix));
  if (matches.length !== 1)
    throw new Error(`Expected one ${suffix} in ${basename(archive)}, found ${matches.length}.`);
  return command('unzip', ['-p', archive, matches[0]]);
}

async function registryArtifact(registry, version) {
  if (registry === 'npm') {
    const metadata = await getJson(`https://registry.npmjs.org/${packageName}/${version}`);
    if (metadata.name !== packageName || metadata.version !== version || !metadata.dist?.tarball)
      throw new Error('npm returned unexpected package metadata.');
    return {
      name: basename(new URL(metadata.dist.tarball).pathname),
      downloadUrl: metadata.dist.tarball,
      publicUrl: `https://www.npmjs.com/package/${packageName}/v/${version}`,
      metadataSha256: null,
      integrity: metadata.dist.integrity,
      archive: 'tar',
    };
  }

  if (registry === 'PyPI') {
    const metadata = await getJson(`https://pypi.org/pypi/${packageName}/${version}/json`);
    if (metadata.info?.name?.toLowerCase() !== packageName || metadata.info?.version !== version)
      throw new Error('PyPI returned unexpected package metadata.');
    const files = metadata.urls?.filter((entry) => entry.packagetype === 'bdist_wheel') ?? [];
    const artifact =
      files.find((entry) => entry.filename.endsWith('-py3-none-any.whl')) ?? files[0];
    if (!artifact?.url) throw new Error('PyPI did not return a wheel for this release.');
    return {
      name: artifact.filename,
      downloadUrl: artifact.url,
      publicUrl: `https://pypi.org/project/${packageName}/${version}/`,
      metadataSha256: artifact.digests?.sha256,
      integrity: null,
      archive: 'zip',
    };
  }

  if (registry === 'crates.io') {
    const metadata = await getJson(`https://crates.io/api/v1/crates/${packageName}/${version}`);
    if (metadata.version?.num !== version || !metadata.version?.dl_path)
      throw new Error('crates.io returned unexpected package metadata.');
    return {
      name: `${packageName}-${version}.crate`,
      downloadUrl: new URL(metadata.version.dl_path, 'https://crates.io').href,
      publicUrl: `https://crates.io/crates/${packageName}/${version}`,
      metadataSha256: metadata.version.checksum,
      integrity: null,
      archive: 'tar',
    };
  }

  if (registry === 'Go') {
    const module = 'github.com/mailschema/go';
    const moduleVersion = `v${version}`;
    const metadata = await getJson(`https://proxy.golang.org/${module}/@v/${moduleVersion}.info`);
    if (metadata.Version !== moduleVersion)
      throw new Error('The Go module proxy returned unexpected package metadata.');
    return {
      name: `${moduleVersion}.zip`,
      downloadUrl: `https://proxy.golang.org/${module}/@v/${moduleVersion}.zip`,
      publicUrl: `https://pkg.go.dev/${module}@${moduleVersion}`,
      metadataSha256: null,
      integrity: null,
      archive: 'zip',
    };
  }

  if (registry === 'RubyGems') {
    const metadata = await getJson(
      `https://rubygems.org/api/v2/rubygems/${packageName}/versions/${version}.json`,
    );
    if (metadata.name !== packageName || metadata.version !== version || !metadata.sha)
      throw new Error('RubyGems returned unexpected package metadata.');
    return {
      name: `${packageName}-${version}.gem`,
      downloadUrl: `https://rubygems.org/gems/${packageName}-${version}.gem`,
      publicUrl: `https://rubygems.org/gems/${packageName}/versions/${version}`,
      metadataSha256: metadata.sha,
      integrity: null,
      archive: 'gem',
    };
  }

  throw new Error(`Unsupported registry: ${registry}`);
}

// A gem is an uncompressed tar whose files sit in data.tar.gz at their gem paths.
function gemEntry(archive, path) {
  const data = command('tar', ['-xOf', archive, 'data.tar.gz']);
  const entries = command('tar', ['-tzf', '-'], data);
  if (!entries.toString('utf8').split('\n').includes(path))
    throw new Error(`Expected ${path} in ${basename(archive)}.`);
  return command('tar', ['-xOzf', '-', path], data);
}

async function verify(registry, version) {
  const contracts = materializePackageArtifacts(root, registry).map((artifact) => ({
    ...artifact,
    bytes: Buffer.from(artifact.bytes),
  }));
  const schema = contracts.find((artifact) => artifact.name === 'contribution').bytes;
  const schemaSha256 = sha256(schema);
  const artifact = await registryArtifact(registry, version);
  const bytes = await download(artifact.downloadUrl);
  const artifactSha256 = sha256(bytes);
  if (artifact.metadataSha256 && artifact.metadataSha256 !== artifactSha256)
    throw new Error(`${registry} metadata and downloaded artifact hashes disagree.`);
  verifyIntegrity(bytes, artifact.integrity);

  const temporary = await mkdtemp(resolve(tmpdir(), 'mailschema-release-'));
  const archive = resolve(temporary, artifact.name);
  try {
    await writeFile(archive, bytes);
    for (const contract of contracts) {
      const suffix = `/${contract.paths[registry]}`;
      const packaged =
        artifact.archive === 'gem'
          ? gemEntry(archive, contract.paths[registry])
          : artifact.archive === 'zip'
            ? zipEntry(archive, suffix)
            : tarEntry(archive, suffix);
      if (!packaged.equals(contract.bytes))
        throw new Error(
          `${registry} ${version} does not contain the canonical ${contract.name} contract bytes.`,
        );
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }

  return {
    format: 'mailschema-package-release/2',
    checkedAt: new Date().toISOString(),
    version,
    schemaSha256,
    contracts: contracts.map(({ name, bytes }) => ({ name, sha256: sha256(bytes) })),
    verification:
      'Public registry metadata, artifact integrity where published, and an independent download matched every canonical contract distributed by this package.',
    channels: [
      {
        registry,
        name: registry === 'Go' ? 'github.com/mailschema/go' : packageName,
        version,
        url: artifact.publicUrl,
        artifacts: [
          {
            name: artifact.name,
            sha256: artifactSha256,
            ...(artifact.integrity ? { integrity: artifact.integrity } : {}),
          },
        ],
        status: 'verified',
      },
    ],
  };
}

async function writePromotion(registry, version, evidence) {
  const reference = `${slugs[registry]}-${version}-contracts`;
  const evidencePath = resolve(root, 'docs/releases', `${reference}.json`);
  const selectionPath = resolve(root, 'docs/releases/current.json');
  const existingEvidence = await readFile(evidencePath, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (existingEvidence) {
    const recorded = JSON.parse(existingEvidence);
    evidence.checkedAt = recorded.checkedAt;
    const repeated = `${JSON.stringify(evidence, null, 2)}\n`;
    if (existingEvidence !== repeated)
      throw new Error(
        `Release evidence already exists with different content and will not be overwritten: ${evidencePath}`,
      );
  }
  const encodedEvidence = `${JSON.stringify(evidence, null, 2)}\n`;

  const selection = JSON.parse(await readFile(selectionPath, 'utf8'));
  if (selection.schema !== 'mailschema-package-set/1')
    throw new Error('Unknown package-set selection format.');
  if (selection.schemaSha256 !== evidence.schemaSha256)
    throw new Error('The package-set manifest targets different schema bytes.');
  const next = selection.channels.filter((entry) => entry.registry !== registry);
  next.push({ registry, evidence: reference, version });
  next.sort((left, right) => order.indexOf(left.registry) - order.indexOf(right.registry));
  selection.channels = next;

  await writeFile(evidencePath, encodedEvidence);
  await writeFile(selectionPath, `${JSON.stringify(selection, null, 2)}\n`);
  return { evidencePath, selectionPath };
}

const args = parseArguments(process.argv.slice(2));
if (args.help) {
  console.log(usage());
  process.exit(0);
}
if (!args.registry || !args.version)
  throw new Error(`${usage()}\n\nRegistry and version are required.`);
if (!Object.hasOwn(slugs, args.registry))
  throw new Error('Registry must be npm, PyPI, crates.io, Go or RubyGems.');
if (!/^\d+\.\d+\.\d+$/.test(args.version)) throw new Error('Version must use x.y.z format.');

const evidence = await verify(args.registry, args.version);
if (args.promote) {
  const written = await writePromotion(args.registry, args.version, evidence);
  console.log(
    `Verified and promoted ${args.registry} ${args.version}.\nEvidence: ${written.evidencePath}\nSelection: ${written.selectionPath}`,
  );
} else {
  console.log(
    `Verified ${args.registry} ${args.version} against schema ${evidence.schemaSha256}. No files changed.`,
  );
}
