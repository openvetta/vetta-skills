#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
try {
  const name = option('--name'), repository = option('--repository'), minAppVersion = option('--min-app-version');
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name ?? '')) throw new Error('--name must be a lowercase marketplace slug');
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '')) throw new Error('--repository must be a canonical GitHub HTTPS URL');
  if (!/^\d+\.\d+\.\d+$/.test(minAppVersion ?? '')) throw new Error('--min-app-version must be stable x.y.z');
  const target = resolve(option('--target') ?? name);
  if (existsSync(target) && readdirSync(target).length) throw new Error('Refusing to overwrite a nonempty directory');
  const write = (path, content) => { mkdirSync(join(target, path, '..'), { recursive: true }); writeFileSync(join(target, path), content); };
  const json = (path, value) => write(path, JSON.stringify(value, null, 2) + '\n');
  json('.vetta/marketplace.source.json', { schemaVersion: 3, name, displayName: name, repository, minAppVersion, abilities: [] });
  json('.vetta/publish.json', { distributionBranch: 'gh-pages', toolingCommit: 'b1a575d37d5a5dadc684f25a41ee1b3706556551' });
  for (const type of ['skills', 'mcp', 'plugins', 'bundles']) write(`abilities/${type}/.gitkeep`, '');
  write('.gitignore', 'node_modules/\n.marketplace-build/\n.tooling/\n.release-artifacts/\nabilities/plugins/*/dist/\nabilities/plugins/*/release/\n');
  write('README.md', `# ${name}\n\nA static Vetta ability repository.\n\nSource: main. Desktop source: ${repository}, branch gh-pages (available after the first successful publication).\n\nEdit .vetta/marketplace.source.json and ability sources. Increase the ability version when ready to publish. Review the normal source PR; after merge, CI builds new versions, uploads immutable Release packages and generates the gh-pages index. No generated catalog PR is required.\n\nProtect main with required reviews and the marketplace-source check. The publish job needs Contents: Write for Releases and gh-pages. GitHub Pages hosting is optional; Desktop can read the gh-pages branch directly, including private repositories.\n\nRun node scripts/marketplace.mjs check and node --test tests/*.test.mjs. Full local publication preparation: node scripts/marketplace.mjs build. This does not upload anything. Never replace an existing package version.\n`);
  write('AGENTS.md', `# ${name}\n\nAuthor .vetta/marketplace.source.json and ability sources. .vetta/marketplace.json is generated on gh-pages.\n\n- Keep paths inside the repository; no symbolic links.\n- Keep ability identities and versions consistent. Plugins declare minAppVersion in the source entry; the builder derives API, permissions, commands and SHA-256.\n- Increase ability versions to release runtime changes. Unchanged versions keep their published runtime content.\n- Review source and version changes through normal PRs. Merging into main permits automatic publication.\n- Do not commit plugin dist, release archives or generated market indexes to main. Do not manually assign marketplaceVersion.\n- Run node scripts/marketplace.mjs check and node --test tests/*.test.mjs. Inspect generated distributions with the pinned OpenVetta reconciliation and publication check.\n- Read the Vetta plugin documentation via npx vetta-plugin-cli docs inside a plugin project.\n- Preserve historical release records and immutable artifacts.\n- Remote mutations require user authorization.\n`);
  cpSync(new URL('../assets/scripts', import.meta.url), join(target, 'scripts'), { recursive: true });
  cpSync(new URL('../assets/tests', import.meta.url), join(target, 'tests'), { recursive: true });
  cpSync(new URL('../assets/.github', import.meta.url), join(target, '.github'), { recursive: true });
  console.log(`Created ${target}\nDesktop source: ${repository} @ gh-pages`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
