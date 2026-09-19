# Vetta Skills Agent Guide

This is a multi Skill repository for Vetta workflows.

## Structure

- Put each installable Skill in `skills/<skill-name>/SKILL.md`.
- Keep the entrypoint concise. Put schemas and conditional procedures in `references/`.
- Put repeatable deterministic work in `scripts/` and execute changed scripts before committing.
- Do not duplicate Vetta contracts without linking to their implementation source in `openvetta/open-vetta`.
- Use lowercase kebab case Skill names and keep the folder name equal to the frontmatter `name`.
- Update the root README when adding or removing a public Skill.

## Validation

Run:

```bash
npm run check
npx skills add . --list
```

When a Skill creates artifacts, also run it in a temporary directory and validate the generated result with the public toolchain it documents.
