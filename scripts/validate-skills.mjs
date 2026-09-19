import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = join(root, "skills");
const failures = [];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

for (const entry of readdirSync(skillsRoot, { withFileTypes: true }).filter((item) => item.isDirectory())) {
  const skillDir = join(skillsRoot, entry.name);
  const skillFile = join(skillDir, "SKILL.md");
  if (!statSync(skillFile, { throwIfNoEntry: false })?.isFile()) {
    failures.push(`${entry.name}: missing SKILL.md`);
    continue;
  }
  const source = readFileSync(skillFile, "utf8");
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)?.[1];
  const name = frontmatter ? /^name:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim().replace(/^['"]|['"]$/g, "") : undefined;
  const description = frontmatter ? /^description:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim() : undefined;
  if (name !== entry.name) failures.push(`${entry.name}: frontmatter name must match the folder`);
  if (!description) failures.push(`${entry.name}: missing frontmatter description`);
  if (source.includes("[TODO")) failures.push(`${entry.name}: unfinished TODO placeholder`);

  for (const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(?:https?:|#)/.test(target)) continue;
    const path = resolve(skillDir, target);
    if (!statSync(path, { throwIfNoEntry: false })) failures.push(`${entry.name}: broken link ${target}`);
  }
}

for (const script of walk(skillsRoot).filter((path) => path.endsWith(".mjs"))) {
  const check = spawnSync(process.execPath, ["--check", script], { encoding: "utf8" });
  if (check.status !== 0) failures.push(`${relative(root, script)}: ${check.stderr.trim()}`);
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  const skillCount = readdirSync(skillsRoot, { withFileTypes: true }).filter((item) => item.isDirectory()).length;
  process.stdout.write(`Validated ${skillCount} Skill(s).\n`);
}
