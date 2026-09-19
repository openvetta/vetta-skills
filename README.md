# Vetta Skills

Reusable Agent Skills for building and integrating with [Vetta](https://github.com/openvetta/open-vetta). This repository uses a multi Skill layout so more Vetta workflows can be added under `skills/`.

## Install

List the available Skills:

```bash
npx skills add openvetta/vetta-skills --list
```

Install the marketplace creation Skill globally for Codex:

```bash
npx skills add openvetta/vetta-skills --skill create-vetta-marketplace -g -a codex -y
```

For interactive installation across supported agents:

```bash
npx skills add openvetta/vetta-skills --skill create-vetta-marketplace
```

The `skills` CLI is maintained by [vercel-labs/skills](https://github.com/vercel-labs/skills).

## Available Skills

### `create-vetta-marketplace`

Creates, migrates, validates, publishes, and connects GitHub based Vetta ability marketplaces. It covers schema v3 plugin artifacts, Skills, Scenes, MCP servers, Bundles, Desktop source configuration, private repositories, compatibility branches, and publication checks. New repositories include a protected CI workflow that builds immutable `.vettapkg` assets and opens Draft catalog PRs without automatically merging them.

## Contributing

Each Skill lives at `skills/<name>/SKILL.md`. Keep detailed or conditional material in `references/` and deterministic helpers in `scripts/`.

Run before committing:

```bash
npm run check
npx skills add . --list
```

## License

Apache-2.0
