# Vetta marketplace contract

This reference summarizes the schema v3 contract implemented by Vetta Desktop. When implementation details may have changed, compare it with:

- `apps/desktop/src/main/abilities/open-marketplace/marketplace-schema.ts` in the current [open-vetta schema v3 branch](https://github.com/openvetta/open-vetta/blob/refa/plugin-marketplace-v3/apps/desktop/src/main/abilities/open-marketplace/marketplace-schema.ts)
- [the public marketplace guide](https://github.com/openvetta/open-vetta/blob/main/docs/open-marketplace.md)
- [the official marketplace schema v3 branch](https://github.com/openvetta/vetta-official-marketplace/tree/refa/marketplace-v3) for a production sized repository

## Repository layout

```text
.vetta/marketplace.json
abilities/
  plugins/<slug>/
  skills/<slug>/
  scenes/<slug>/
  mcp/<slug>/
  bundles/<slug>/
.github/workflows/marketplace.yml
```

Desktop downloads the generated gh-pages distribution archive (source and build files are excluded), validates it, and creates a local immutable snapshot keyed by the source and `marketplaceVersion`. Search and filtering happen locally.

Paths must be relative, remain inside the repository, and contain no symbolic links. A custom Desktop source must be a GitHub repository and its configured ref must be a branch.

## Generated manifest

The manifest lives at `.vetta/marketplace.json`:

```json
{
  "schemaVersion": 3,
  "name": "example-abilities",
  "displayName": "Example Abilities",
  "marketplaceVersion": "1.0.0",
  "repository": "https://github.com/example/example-abilities",
  "minAppVersion": "0.5.59",
  "abilities": []
}
```

- `schemaVersion`: use `3` for versioned plugin artifacts. Versions 1 and 2 are legacy directory installation contracts.
- `name`: lowercase slug, up to 64 characters.
- `marketplaceVersion`: immutable version of the whole snapshot. CI changes it when distributed content changes. Do not maintain it in the source configuration.
- `repository`: canonical HTTPS GitHub repository URL.
- `minAppVersion`: lowest stable Desktop SemVer that understands the snapshot.
- `abilities[].version`: version of one ability.
- `abilities[].configVersion`: positive integer for that ability's local configuration structure; it is not an App compatibility selector.

Every listed ability has `type`, `slug`, `name`, `description`, `version`, `source.path`, and optional presentation fields such as `license`, `author`, `icon`, `category`, `categoryI18n`, `tags`, and `detail`.

`slug` is installation identity. Do not change it to rename display text. Slugs must be unique across top level entries.

## Plugin

Schema v3 selects the highest release compatible with both the current Desktop version and host Plugin API:

```json
{
  "type": "plugin",
  "slug": "demo-plugin",
  "name": "Demo Plugin",
  "description": "Demonstrates a versioned plugin release.",
  "version": "1.2.0",
  "configVersion": 1,
  "source": { "path": "abilities/plugins/demo-plugin" },
  "releases": [
    {
      "version": "1.2.0",
      "minAppVersion": "0.5.59",
      "pluginApiVersion": "^2.5.0",
      "permissions": [],
      "commands": [],
      "artifact": {
        "url": "https://github.com/example/example-abilities/releases/download/plugin-demo-plugin-1.2.0/demo-plugin-1.2.0.vettapkg",
        "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
      }
    }
  ],
  "config": {}
}
```

Rules:

- `version` equals the highest semantic release version.
- Each release version is unique and stable `x.y.z`.
- Each release `minAppVersion` is at least the marketplace minimum.
- `pluginApiVersion` is a caret range such as `^2.5.0` and must match the packaged `plugin.json`.
- `permissions` and `commands` must exactly match the package manifest.
- Artifact URLs use HTTPS without credentials or fragments. New packages use `.vettapkg`; `.zip` is only a legacy import compatibility path.
- SHA-256 is 64 lowercase hexadecimal characters and covers the exact uploaded bytes.
- Existing release records and assets are immutable. Publish a new plugin version to correct them.
- `source.path` is used for presentation content. Desktop installs runtime bytes from `releases[]`, so generated runtime output does not belong in the catalog Git history.

## Skill and Scene

Both types install a safe directory tree from the marketplace snapshot. The source directory must contain `SKILL.md` with matching identity:

```yaml
---
name: example-skill
description: Explain what the ability does and when it applies.
version: 1.0.0
---
```

The frontmatter `name` and `version` must equal the catalog `slug` and `version`. Scene uses the same package contract but installs into the Scene store.

## MCP

An MCP source directory contains `mcp.json`. Catalog MCP entries must not contain a `config` key; Desktop derives runtime configuration from the package.

At minimum, `mcp.json` declares:

```json
{
  "schemaVersion": 1,
  "slug": "example-mcp",
  "version": "1.0.0",
  "server": {
    "type": "http",
    "url": "https://example.com/mcp"
  },
  "parameters": [],
  "browserAuth": false
}
```

Schema v3 `mcp.json` may additionally declare a managed binary runtime and post install setup. Each platform binary needs an HTTPS URL, SHA-256, archive type, and safe executable path. Desktop never runs repository supplied install scripts.

## Bundle

A Bundle contains `config.members`, each with `type` and `slug`. A member can reference a separately listed top level ability, or declare its own `source.path` when it exists only inside the Bundle. Bundle only schema v3 plugins keep their `releases[]` on the member entry.

Do not list a Bundle only member at the top level unless it should also appear independently. Member identities and release histories must remain consistent wherever referenced.

## Presentation and localization

Use `ability.json` and package local files for icons and detail content. Desktop renders a fixed allowlist of blocks and does not execute marketplace HTML, JavaScript, CSS, or iframes.

Keep the default catalog text in English. Put translations in `detail.i18n`, and category translations in `categoryI18n`. Locale overrides replace array values rather than concatenating them. All referenced files must remain within the ability directory.

## Source declaration

Author `.vetta/marketplace.source.json` with the same listing metadata, but omit `marketplaceVersion` and plugin `releases`. Each plugin source entry, including bundle-only members, declares `minAppVersion`. The builder derives immutable release records and generates `.vetta/marketplace.json` on gh-pages. These are two stages of one model, not two manually synchronized catalogs.
