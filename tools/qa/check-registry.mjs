import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const registryPath = path.join(root, "docs/quality/qa-registry.yaml");
const registry = parseYaml(await readFile(registryPath, "utf8"));
const failures = [];

function relativeExists(relativePath) {
  return existsSync(path.join(root, relativePath));
}

function extractSectionItems(markdown, heading) {
  const marker = `## ${heading}\n`;
  const start = markdown.indexOf(marker);
  if (start < 0) return [];
  const remainder = markdown.slice(start + marker.length);
  const nextHeading = remainder.search(/^## /mu);
  const section = nextHeading < 0 ? remainder : remainder.slice(0, nextHeading);
  const listed = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^(?:\d+\.|- )/u.test(line));
  if (listed.length > 0) return listed;
  const prose = section.replace(/\s+/gu, " ").trim();
  return prose ? [prose] : [];
}

function uniqueMatches(markdown, pattern) {
  const expression = new RegExp(pattern, "gmu");
  const values = [];
  for (const match of markdown.matchAll(expression)) {
    const value = match[1] ?? match[0];
    if (value && value !== "ID") values.push(value);
  }
  return [...new Set(values)].sort();
}

const manifest = parseYaml(
  await readFile(path.join(root, "docs/prd/manifest.yaml"), "utf8"),
);
const expectedImports = new Map([
  ["master", "docs/prd/MASTER-PRD.md"],
  ...Object.entries(manifest.phases ?? {}).map(([id, details]) => [
    id,
    `docs/prd/${details.file}`,
  ]),
  ...Object.entries(manifest.modules ?? {}).map(([id, details]) => [
    id,
    `docs/prd/${details.file}`,
  ]),
]);

const requirementInventory = [];
for (const [key, expectedFile] of expectedImports) {
  const imported = registry.requirement_imports?.[key];
  if (!imported) {
    failures.push(`missing requirement import ${key}`);
    continue;
  }
  if (imported.file !== expectedFile) {
    failures.push(
      `${key} imports ${imported.file}; PRD manifest requires ${expectedFile}`,
    );
  }
  if (!relativeExists(imported.file)) {
    failures.push(`${key} source does not exist: ${imported.file}`);
    continue;
  }
  if (!["active", "tracer", "deferred"].includes(imported.lifecycle)) {
    failures.push(`${key} has invalid lifecycle ${imported.lifecycle}`);
  }
  if (!Array.isArray(imported.evidence) || imported.evidence.length === 0) {
    failures.push(`${key} has no evidence route`);
  } else {
    for (const evidence of imported.evidence) {
      if (!relativeExists(evidence)) {
        failures.push(`${key} evidence does not exist: ${evidence}`);
      }
    }
  }
  const markdown = await readFile(path.join(root, imported.file), "utf8");
  const stories = extractSectionItems(markdown, "User Stories");
  const testing = extractSectionItems(markdown, "Testing Decisions");
  if (stories.length === 0) failures.push(`${key} imports no User Stories`);
  if (testing.length === 0)
    failures.push(`${key} imports no Testing Decisions`);
  stories.forEach((text, index) =>
    requirementInventory.push({
      evidence: imported.evidence,
      id: `${key}-US-${String(index + 1).padStart(3, "0")}`,
      lifecycle: imported.lifecycle,
      source: imported.file,
      text,
    }),
  );
  testing.forEach((text, index) =>
    requirementInventory.push({
      evidence: imported.evidence,
      id: `${key}-TEST-${String(index + 1).padStart(3, "0")}`,
      lifecycle: imported.lifecycle,
      source: imported.file,
      text,
    }),
  );
}

for (const key of Object.keys(registry.requirement_imports ?? {})) {
  if (!expectedImports.has(key))
    failures.push(`unknown requirement import ${key}`);
}

const stableInventory = [];
for (const [key, source] of Object.entries(registry.stable_id_sources ?? {})) {
  if (!relativeExists(source.file)) {
    failures.push(`${key} stable-ID source does not exist: ${source.file}`);
    continue;
  }
  if (!relativeExists(source.evidence)) {
    failures.push(`${key} evidence does not exist: ${source.evidence}`);
  }
  const markdown = await readFile(path.join(root, source.file), "utf8");
  const ids = uniqueMatches(markdown, source.pattern);
  if (ids.length === 0) failures.push(`${key} imported zero stable IDs`);
  ids.forEach((id) =>
    stableInventory.push({
      evidence: source.evidence,
      id,
      source: source.file,
    }),
  );
}

const duplicateStableIds = stableInventory
  .map((item) => item.id)
  .filter((id, index, all) => all.indexOf(id) !== index);
if (duplicateStableIds.length > 0) {
  failures.push(
    `stable IDs imported more than once: ${[...new Set(duplicateStableIds)].join(", ")}`,
  );
}

const visual = registry.visual_contract;
for (const requiredState of [
  "quiet",
  "lower-quick",
  "upper-quick",
  "secondary",
  "manage-players",
]) {
  if (!visual?.tablet_states?.includes(requiredState)) {
    failures.push(`visual contract is missing Tablet state ${requiredState}`);
  }
}

const visualBaselines = registry.visual_baselines;
for (const platform of ["darwin", "linux"]) {
  if (!visualBaselines?.platforms?.includes(platform)) {
    failures.push(`visual baselines are missing platform ${platform}`);
  }
}
if (visualBaselines?.project !== "chromium") {
  failures.push(
    "visual baselines must declare the deterministic chromium project",
  );
}
for (const baseline of visualBaselines?.required ?? []) {
  if (!relativeExists(baseline.test)) {
    failures.push(`visual baseline test is missing: ${baseline.test}`);
    continue;
  }
  const testSource = await readFile(path.join(root, baseline.test), "utf8");
  if (!testSource.includes(`"${baseline.name}"`)) {
    failures.push(
      `visual baseline has no screenshot assertion: ${baseline.name}`,
    );
  }
  for (const platform of visualBaselines.platforms ?? []) {
    const image = `${baseline.test}-snapshots/${baseline.name}-${platform}-${visualBaselines.project}.png`;
    if (!relativeExists(image)) {
      failures.push(`reviewed visual baseline is missing: ${image}`);
    }
  }
}
for (const requiredTheme of ["dark-green", "black-gold", "deep-navy"]) {
  if (!visual?.themes?.includes(requiredTheme)) {
    failures.push(`visual contract is missing theme ${requiredTheme}`);
  }
}
for (const requiredGeometry of [
  "quick_panel",
  "utility_target",
  "utility_gap",
  "action_gap",
  "next_card",
  "next_hand",
  "slider_track",
  "slider_handle",
  "slider_travel",
  "slider_radius",
  "gold_thread",
]) {
  if (!visual?.geometry?.[requiredGeometry]) {
    failures.push(`visual contract is missing geometry ${requiredGeometry}`);
  }
}
if (!relativeExists(registry.manual_evidence?.file ?? "")) {
  failures.push(
    `manual evidence protocol is missing: ${registry.manual_evidence?.file}`,
  );
}

const tabletActions = registry.tablet_secondary_actions;
if (!relativeExists(tabletActions?.source ?? "")) {
  failures.push(
    `Tablet secondary-action source is missing: ${tabletActions?.source}`,
  );
} else {
  const source = await readFile(path.join(root, tabletActions.source), "utf8");
  const evidenceFiles = tabletActions.evidence ?? [];
  const evidenceText = (
    await Promise.all(
      evidenceFiles.map(async (file) => {
        if (!relativeExists(file)) {
          failures.push(`Tablet action evidence is missing: ${file}`);
          return "";
        }
        return readFile(path.join(root, file), "utf8");
      }),
    )
  ).join("\n");
  const requiredActions = tabletActions.required ?? [];
  if (new Set(requiredActions).size !== requiredActions.length) {
    failures.push("Tablet secondary-action IDs are not unique");
  }
  for (const actionId of requiredActions) {
    if (!source.includes(`"${actionId}"`)) {
      failures.push(`Tablet secondary action is absent from UI: ${actionId}`);
    }
    if (!evidenceText.includes(`"${actionId}"`)) {
      failures.push(`Tablet secondary action has no invoked test: ${actionId}`);
    }
  }
}

const requiredCommands = new Set([
  "pnpm qa:registry",
  "pnpm check",
  "pnpm test:coverage",
  "pnpm qa:browser",
  "pnpm audit:prod",
]);
for (const command of requiredCommands) {
  if (!registry.release_blocking_commands?.includes(command)) {
    failures.push(`release-blocking command is missing: ${command}`);
  }
}

for (const budget of [
  "normal_javascript_raw_bytes",
  "normal_javascript_gzip_bytes",
  "normal_css_raw_bytes",
  "airplane_html_raw_bytes",
]) {
  const value = registry.performance_contract?.artifacts?.[budget];
  if (!Number.isSafeInteger(value) || value <= 0) {
    failures.push(`performance budget is missing or invalid: ${budget}`);
  }
}
if (
  !Number.isSafeInteger(
    registry.performance_contract?.browser_interaction_timeout_ms,
  )
) {
  failures.push("browser interaction timeout is missing or invalid");
}

const outputDirectory = path.join(root, "test-results/qa");
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  path.join(outputDirectory, "requirements-inventory.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      requirements: requirementInventory,
      stableIds: stableInventory,
    },
    null,
    2,
  )}\n`,
);

if (failures.length > 0) {
  console.error(`QA registry failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `QA registry passed: ${requirementInventory.length} imported PRD requirements, ${stableInventory.length} stable decisions/feedback IDs, ${expectedImports.size} authoritative PRD documents.`,
  );
}
