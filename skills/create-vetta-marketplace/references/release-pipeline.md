# Static ability repository

Use the Helm chart-releaser publication model: source PR → build unpublished versions → GitHub Release packages → generated index on gh-pages. The tooling adapts this model to Vetta; it does not publish Helm charts.

## Author and release

1. Maintain `.vetta/marketplace.source.json` and the ability directories on `main`.
2. Increase the ability version when runtime changes are ready to release. Plugin source entries also declare `minAppVersion`.
3. Submit and review a normal source PR. Protect `main` with required reviews and the `marketplace-source` check.
4. Merge. CI builds unpublished plugin versions, checks stable Desktop compatibility, uploads `.vettapkg` assets, verifies their bytes, and publishes the generated distribution.
5. Add the repository to Desktop with branch `gh-pages` after the first successful run.

No release-plan file, generated catalog PR, or manually bumped marketplace version is used. `main` contains source; Releases contain plugin packages; `gh-pages` contains `.vetta/marketplace.json`, presentation resources and installable non-plugin content. GitHub Pages hosting is optional because Desktop reads the distribution branch directly.

## Validation and recovery

Use Node.js 22.21.1+ and Python 3. Run `node scripts/marketplace.mjs check`, `node --test tests/*.test.mjs`, and `node scripts/marketplace.mjs build` locally. The build command uses a fresh output directory and does not upload. Use `--previous <checked-out-gh-pages-directory>` for incremental publication. On Windows with a Python shim, set `VETTA_PYTHON` to the real interpreter executable.

The workflow reconciles the generated distribution and runs the Desktop publication validator using the Plugin CLI source and validator from the fixed revision in `.vetta/publish.json`. Keep this revision pinned; update it through source review.

The build job has read-only permissions and no write token. The publication job has `contents: write`, uploads the already built bytes, and never merges or pushes source changes to main. It does not run ability build scripts.

Repeated runs verify existing asset bytes; conflicting bytes require a new ability version. The index changes only after verification succeeds. A newer source/distribution revision makes an old run fail rather than overwrite current state. Rerun the latest revision. Previously published versions remain available for compatible Desktop builds.

Stable publication requires the declared Desktop versions to have completed stable releases. Local fixtures can validate a development Desktop, but cannot waive the stable publication gate.

## Existing repositories

Do not run the scaffold over an existing marketplace. Preserve existing stable refs used by old clients. Import a verified existing schema v3 distribution into `gh-pages` if its release history is valid; never seed unavailable or changed artifacts. Otherwise create a new distribution from source and verify its first publication before switching clients. Historical `.zip` packages remain readable.

Changing source refs affects source identity and caches. Do not silently rewrite user-added sources. A rollback must publish a fresh index revision; never overwrite an existing release asset or reuse a snapshot version with different bytes.
