# Schema v3 release pipeline

## Why schema v3 separates the catalog from plugin bytes

The catalog and Desktop App evolve independently. A plugin update can require a newer App or Plugin API. Schema v3 records multiple immutable plugin releases and lets Desktop select the highest compatible version before presenting an install or update.

Keep source and presentation files in Git. Put built `.vettapkg` files in immutable Release storage. This keeps generated output out of source history and gives every installed package a URL and digest that can be audited or rolled back.

## Publish one plugin release

1. Update and test the plugin source.
2. Set a new stable `plugin.json#version` and the actual `pluginApiVersion`, permissions, and commands.
3. Build with `@vetta-org/plugin-vite`. New builds should produce `release/<slug>-<version>.vettapkg`.
4. Inspect the package and compute SHA-256 over its exact bytes.
5. Create a unique release tag, for example `plugin-<slug>-<version>`.
6. Upload the `.vettapkg` without rebuilding, recompressing, or renaming it after hashing. Enable immutable releases when the hosting policy supports them.
7. Add a new `releases[]` record with the stable URL and digest. Do not edit older records.
8. Set the ability's top level `version` to the highest release and advance `marketplaceVersion`.
9. Run:

   ```bash
   npx --yes @vetta-org/plugin-cli@^0.1.6 sync --check
   ```

10. Run the publication gate from an `open-vetta` checkout:

    ```bash
    node scripts/release/check-plugin-marketplace-publication.mjs \
      /path/to/marketplace/.vetta/marketplace.json
    ```

The gate fails closed when a declared minimum Desktop version is not a completed stable OpenVetta GitHub Release, the released host does not support schema v3 or the declared Plugin API, an artifact is unavailable or too large, or its SHA-256 differs.

Schema v3 is being prepared for Desktop 0.5.59. Until that stable Desktop release exists, use the local candidate test for end to end validation; the publication gate should continue to reject promotion that claims 0.5.59 compatibility.

The scaffolded GitHub Actions workflow runs both index reconciliation and this publication gate.

## Compatibility branches

Desktop versions that only understand schema v1/v2 install plugins directly from `source.path` and therefore require committed built runtime files. They reject schema v3 and keep an older cached snapshot when available.

When old clients still need support:

- keep the legacy schema v2 catalog and built plugin directories on its existing stable branch
- create a separate schema v3 branch or repository for current Desktop
- configure each Desktop release line to use the matching branch
- do not advance the old branch to schema v3 until that client line is retired

A branch switch changes the source identity and cache. A catalog update within one branch must still use a new `marketplaceVersion`.

## Promotion and rollback

Build candidate packages once. Validate those exact bytes locally, upload them, pass CI, then advance the stable catalog branch. Do not rebuild during promotion.

To roll back, restore references to previously verified artifacts and publish a new, higher `marketplaceVersion`. Never replace an old Release asset or reuse an old marketplace version with different content.
