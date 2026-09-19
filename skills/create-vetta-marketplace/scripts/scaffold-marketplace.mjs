#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);

function option(name) {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
  return value;
}

function usage() {
  return "Usage: node scaffold-marketplace.mjs --name <slug> --repository https://github.com/<owner>/<repo> --min-app-version <x.y.z> [--target <directory>]";
}

function appendIgnored(path, entry) {
  const current = existsSync(path) ? readFileSync(path, "utf8") : "";
  const lines = current.split(/\r?\n/).filter(Boolean);
  if (!lines.includes(entry)) lines.push(entry);
  writeFileSync(path, `${lines.join("\n")}\n`, "utf8");
}

function agentsGuide(name) {
  return `# ${name}

This repository is a Vetta schema v3 ability marketplace. Abilities live below \`abilities/\`; the catalog is \`.vetta/marketplace.json\`.

## Invariants

- Keep every \`source.path\` inside this repository and do not add symlinks.
- Keep catalog identity and version equal to the package identity file.
- Run \`npx --yes @vetta-org/plugin-cli@^0.1.6 sync\` after changing an ability, then review its output.
- Run \`npx --yes @vetta-org/plugin-cli@^0.1.6 sync --check\` before every push.
- Advance \`marketplaceVersion\` for every content change. Never reuse a published version for different bytes.
- Publish plugin runtime bytes as immutable \`.vettapkg\` Release assets. Record the exact URL and SHA-256 in \`releases[]\`.
- Do not commit plugin \`dist/\`, \`release/\`, or generated packages. Schema v3 installs plugins from Release assets.
- Do not edit or replace an existing plugin release record; publish a new plugin version.
- Keep MCP configuration in \`mcp.json\`, never in the catalog entry.

## Plugin development

Create a plugin source directory with:

\`\`\`bash
npx @vetta-org/plugin-cli init --id <slug> --name "<Display Name>" abilities/plugins/<slug>
cd abilities/plugins/<slug>
npm install
npx vetta-plugin-cli docs --check-latest
\`\`\`

Build and test from the plugin directory. Keep source if this repository owns it, but upload the generated \`.vettapkg\` outside Git and leave only presentation files required by \`source.path\`.
`;
}

function readme(name, repository) {
  return `# ${name}

A schema v3 Vetta ability marketplace.

Add it in Vetta Desktop under **Abilities → Marketplace sources → Add source**:

\`\`\`text
Repository: ${repository}
Branch: main
\`\`\`

The catalog is \`.vetta/marketplace.json\`. Run \`npx --yes @vetta-org/plugin-cli@^0.1.6 sync --check\` before publishing changes.
`;
}

const workflow = `name: Marketplace checks

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Reconcile catalog and ability packages
        run: npx --yes @vetta-org/plugin-cli@^0.1.6 sync --check

      - name: Read marketplace schema
        id: schema
        run: echo "version=$(node -p 'require(\"./.vetta/marketplace.json\").schemaVersion')" >> "$GITHUB_OUTPUT"

      - uses: actions/checkout@v4
        if: steps.schema.outputs.version == '3'
        with:
          repository: openvetta/open-vetta
          ref: main
          path: .tooling/open-vetta

      - name: Verify published plugin artifacts and Desktop compatibility
        if: steps.schema.outputs.version == '3'
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: node .tooling/open-vetta/scripts/release/check-plugin-marketplace-publication.mjs .vetta/marketplace.json
`;

try {
  const name = option("--name");
  const repository = option("--repository")?.replace(/\.git$/i, "").replace(/\/$/, "");
  const minAppVersion = option("--min-app-version");
  if (!name || !repository || !minAppVersion) throw new Error(usage());
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) throw new Error("--name must be a lowercase marketplace slug");
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error("--repository must be a canonical HTTPS GitHub repository URL");
  }
  if (!/^\d+\.\d+\.\d+$/.test(minAppVersion)) throw new Error("--min-app-version must be stable x.y.z SemVer");

  const target = resolve(option("--target") ?? name);
  if (existsSync(join(target, ".vetta", "marketplace.json"))) {
    throw new Error(`Refusing to overwrite an existing marketplace: ${target}`);
  }
  if (process.platform === "win32" && !/^[A-Za-z0-9_ .:\\/-]+$/.test(target)) {
    throw new Error("On Windows, --target may only contain letters, digits, spaces, dots, underscores, colons, slashes, and hyphens");
  }

  const scaffoldArgs = [
    "--yes",
    "@vetta-org/plugin-cli@^0.1.6",
    "init",
    "hub",
    "--name",
    name,
    "--repository",
    repository,
    "--min-app-version",
    minAppVersion,
    target,
  ];
  // Windows needs cmd.exe for the npx.cmd shim. Values are validated above and individually quoted.
  const scaffold = process.platform === "win32"
    ? spawnSync(`npx ${scaffoldArgs.map((value) => `"${value}"`).join(" ")}`, {
        stdio: "inherit",
        shell: true,
      })
    : spawnSync("npx", scaffoldArgs, { stdio: "inherit", shell: false });
  if (scaffold.error) throw scaffold.error;
  if (scaffold.status !== 0) throw new Error(`Vetta Plugin CLI scaffold failed with exit code ${scaffold.status}`);

  const manifestPath = join(target, ".vetta", "marketplace.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.schemaVersion = 3;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  mkdirSync(join(target, "abilities", "bundles"), { recursive: true });
  writeFileSync(join(target, "abilities", "bundles", ".gitkeep"), "", "utf8");
  appendIgnored(join(target, ".gitignore"), ".release-artifacts/");
  appendIgnored(join(target, ".gitignore"), ".tooling/");
  writeFileSync(join(target, "AGENTS.md"), agentsGuide(name), "utf8");
  writeFileSync(join(target, "README.md"), readme(name, repository), "utf8");
  writeFileSync(join(target, ".github", "workflows", "marketplace.yml"), workflow, "utf8");

  process.stdout.write(`Created schema v3 Vetta marketplace ${name} at ${target}\n`);
  process.stdout.write("Next: add abilities, publish immutable plugin packages, then run sync --check.\n");
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
