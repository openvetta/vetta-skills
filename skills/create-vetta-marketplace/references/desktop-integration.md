# Desktop integration

## Add an ordinary marketplace

In Vetta Desktop, open **Abilities → Marketplace sources → Add source** and enter:

- repository: `owner/repository` or `https://github.com/owner/repository`
- branch: the branch containing `.vetta/marketplace.json`, `gh-pages` for the static repository model
- optional display name
- optional GitHub credential for a private repository

Each source can be refreshed separately. Disabling or removing a source stops catalog discovery; it does not uninstall abilities already installed from it.

For a private repository, use a fine grained GitHub personal access token limited to that repository with `Contents: Read-only`. Desktop stores it in the operating system credential store and uses it for GitHub Contents and zipball APIs. Never put the token in the repository URL, manifest, environment committed to Git, screenshots, or logs.

Private plugin Release assets should use the GitHub REST asset URL for the same repository when authenticated download is required:

```text
https://api.github.com/repos/<owner>/<repo>/releases/assets/<asset-id>
```

Desktop forwards the source credential only to that exact repository's asset API request and removes it before following the signed download redirect.

## Replace a distribution's built in marketplace

This is for people building a Vetta distribution, not ordinary marketplace users. Configure the Desktop process or build with:

```text
VETTA_OPEN_MARKETPLACE_REPOSITORY=https://github.com/<owner>/<repository>
VETTA_OPEN_MARKETPLACE_REF=<branch>
VETTA_OPEN_MARKETPLACE_ARCHIVE_URL=<optional-custom-archive-url>
```

The repository and branch become the built in marketplace coordinates. Restart the development process after changing these values. An archive URL is optional; Desktop derives the GitHub branch archive URL when omitted.

Built-in sources are declared by the distribution environment; there is no hardcoded repository fallback. Existing user source choices must be preserved.

## Verify without touching production

Use a separate marketplace branch and add that exact branch as a custom source. This creates an isolated source identity and cache. Confirm:

1. manual refresh succeeds
2. cards, localized categories, details, and Bundle members render
3. compatible plugin releases are visible for the running App and Plugin API versions
4. install, update, enable, disable, and uninstall work
5. private source authentication does not appear in logs

When developing against an `open-vetta` checkout, validate a local candidate without starting the user's normal Desktop or using its state:

```powershell
$env:VETTA_MARKETPLACE_CANDIDATE_ROOT = 'C:\path\to\marketplace\.marketplace-build\site'
$env:VETTA_MARKETPLACE_CANDIDATE_ARTIFACTS = 'C:\path\to\marketplace\.marketplace-build\artifacts'
bun scripts/quality/run-vitest.mjs --run apps/desktop/src/main/abilities/open-marketplace/marketplace-candidate.local.test.ts
```

The candidate test assembles the generated distribution and serves the explicitly selected local artifact bytes through mocked network requests. It uses a temporary Vetta home and does not publish a repository or Release.

## Diagnose the selected source and artifact

Current Desktop builds emit unified `ability` lifecycle logs. A market install records:

- `installMode: marketplace`
- `artifactKind: vettapkg`, `legacy-zip`, or `snapshot-source`
- `marketplaceSourceId`
- `marketplaceName`
- `marketplaceVersion`
- `marketplaceRepository`
- `marketplaceRef`
- artifact name, sanitized URL, and SHA-256 when a remote plugin package is used

Look for `installation started`, `lifecycle completed`, or `installation failed`. These fields distinguish a market install from `plugin-cli`, `plugin-workbench`, `manual-package`, and `plugin-api` installation paths.

The source branch identifies the catalog snapshot. A GitHub Release tag identifies immutable plugin bytes. Record both when debugging; they are independent version axes.
