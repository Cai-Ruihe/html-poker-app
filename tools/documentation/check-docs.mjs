import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse as parseYaml } from "yaml";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const excludedDirectories = new Set([
  ".git",
  "coverage",
  "dist",
  "node_modules",
]);

async function collectFiles(directory, extension) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory())
      files.push(...(await collectFiles(target, extension)));
    if (entry.isFile() && target.endsWith(extension)) files.push(target);
  }
  return files;
}

function parseFrontMatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match?.[1]) return undefined;
  return parseYaml(match[1]);
}

function countWords(markdown) {
  return markdown
    .replace(/^---[\s\S]*?---/u, "")
    .replace(/```[\s\S]*?```/gu, "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/[^\p{L}\p{N}'-]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
}

function normalizeLocalLink(rawLink) {
  const decoded = decodeURIComponent(rawLink.replace(/^<|>$/gu, ""));
  return decoded.split("#", 1)[0]?.split("?", 1)[0] ?? "";
}

async function checkMarkdown() {
  const markdownFiles = await collectFiles(root, ".md");
  const failures = [];
  const documentIds = new Map();
  const budgets = { master: 1500, module: 1200, phase: 1500 };

  for (const file of markdownFiles) {
    const markdown = await readFile(file, "utf8");
    const relativeFile = path.relative(root, file);
    const frontMatter = parseFrontMatter(markdown);

    if (frontMatter?.id) {
      const previous = documentIds.get(frontMatter.id);
      if (previous)
        failures.push(
          `duplicate document id ${frontMatter.id}: ${previous}, ${relativeFile}`,
        );
      documentIds.set(frontMatter.id, relativeFile);
    }

    if (frontMatter?.kind && frontMatter.kind in budgets) {
      const wordCount = countWords(markdown);
      const budget = budgets[frontMatter.kind];
      if (wordCount > budget)
        failures.push(
          `${relativeFile} has ${wordCount} words; budget is ${budget}`,
        );
    }

    const linkPattern = /\[[^\]]*\]\(([^)]+)\)/gu;
    for (const match of markdown.matchAll(linkPattern)) {
      const rawLink = match[1]?.trim() ?? "";
      if (!rawLink || /^(?:https?:|mailto:|#)/u.test(rawLink)) continue;
      const link = normalizeLocalLink(rawLink);
      if (!link) continue;
      const target = path.resolve(path.dirname(file), link);
      if (!existsSync(target))
        failures.push(`${relativeFile} links to missing ${rawLink}`);
    }
  }

  return {
    failures,
    markdownCount: markdownFiles.length,
    documentCount: documentIds.size,
  };
}

async function checkManifest() {
  const manifestDirectory = path.join(root, "docs/prd");
  const manifest = parseYaml(
    await readFile(path.join(manifestDirectory, "manifest.yaml"), "utf8"),
  );
  const schema = JSON.parse(
    await readFile(
      path.join(manifestDirectory, "manifest.schema.json"),
      "utf8",
    ),
  );
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(manifest);
  const failures = valid
    ? []
    : (validate.errors ?? []).map(
        (error) => `manifest${error.instancePath} ${error.message}`,
      );

  for (const phase of Object.values(manifest.phases ?? {})) {
    if (!existsSync(path.join(manifestDirectory, phase.file)))
      failures.push(`manifest phase file missing: ${phase.file}`);
  }
  for (const module of Object.values(manifest.modules ?? {})) {
    if (!existsSync(path.join(manifestDirectory, module.file)))
      failures.push(`manifest module file missing: ${module.file}`);
  }
  for (const [packName, pack] of Object.entries(manifest.context_packs ?? {})) {
    for (const loadedFile of pack.load ?? []) {
      if (!existsSync(path.join(manifestDirectory, loadedFile)))
        failures.push(`context pack ${packName} file missing: ${loadedFile}`);
    }
  }

  return failures;
}

const markdown = await checkMarkdown();
const failures = [...markdown.failures, ...(await checkManifest())];

if (failures.length > 0) {
  console.error(`Documentation checks failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Documentation checks passed: ${markdown.markdownCount} Markdown files, ${markdown.documentCount} PRD document IDs, valid manifest.`,
  );
}
