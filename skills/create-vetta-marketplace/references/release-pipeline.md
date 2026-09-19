# Schema v3 release pipeline

## Why schema v3 separates the catalog from plugin bytes

The catalog and Desktop App evolve independently. A plugin update can require a newer App or Plugin API. Schema v3 records multiple immutable plugin releases and lets Desktop select the highest compatible version before presenting an install or update.

Keep source and presentation files in Git. Put built `.vettapkg` files in immutable Release storage. This keeps generated output out of source history and gives every installed package a URL and digest that can be audited or rolled back.

## Publish one plugin release

1. Update and test the plugin source.
2. Set a new stable `plugin.json#version` and the actual `pluginApiVersion`, permissions, and commands.
3. Commit the source and version changes to the marketplace branch, or to a repository branch containing its latest commit.
4. Run **Publish plugin release candidate**, selecting that source branch. The workflow installs dependencies, runs available checks and tests, and builds the `.vettapkg` in CI.
5. CI creates or verifies the unique `plugin-<slug>-<version>` Release and computes SHA-256 over the exact uploaded bytes. Enable immutable releases when the hosting policy supports them.
6. CI adds the new immutable `releases[]` record, advances `marketplaceVersion`, and opens a Draft PR. It does not write to or merge the protected branch.
7. Review the Draft PR and run:

   ```bash
   npx --yes @vetta-org/plugin-cli@^0.1.6 sync --check
   ```

8. Run the publication gate from an `open-vetta` checkout:

    ```bash
    node scripts/release/check-plugin-marketplace-publication.mjs \
      /path/to/marketplace/.vetta/marketplace.json
    ```

The gate fails closed when a declared minimum Desktop version is not a completed stable OpenVetta GitHub Release, the released host does not support schema v3 or the declared Plugin API, an artifact is unavailable or too large, or its SHA-256 differs.

Schema v3 is being prepared for Desktop 0.5.59. Until that stable Desktop release exists, use the local candidate test for end to end validation; the publication gate should continue to reject promotion that claims 0.5.59 compatibility.

The scaffolded GitHub Actions workflows build the package, open the Draft PR, run index reconciliation, and execute this publication gate. Mark the PR ready and merge it only after the required reviewers approve it and every gate passes.

In repository Actions settings, grant workflows read and write access and allow GitHub Actions to
create Pull Requests. Protect the marketplace branch with required reviews and required marketplace
checks. The generated workflows still declare only the individual permissions they use.

## Compatibility branches

Desktop versions that only understand schema v1/v2 install plugins directly from `source.path` and therefore require committed built runtime files. They reject schema v3 and keep an older cached snapshot when available.

When old clients still need support:

- keep the legacy schema v2 catalog and built plugin directories on its existing stable branch
- create a separate schema v3 branch or repository for current Desktop
- configure each Desktop release line to use the matching branch
- do not advance the old branch to schema v3 until that client line is retired

A branch switch changes the source identity and cache. A catalog update within one branch must still use a new `marketplaceVersion`.

## Promotion and rollback

Build candidate packages once in CI. The generated Draft PR references those exact uploaded bytes; review and validate it before advancing the stable catalog branch. Do not rebuild during promotion.

To roll back, restore references to previously verified artifacts and publish a new, higher `marketplaceVersion`. Never replace an old Release asset or reuse an old marketplace version with different content.
