import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const brandRoot = path.join(repositoryRoot, "assets/brand");
const manifestPath = path.join(brandRoot, "asset-manifest.json");
const ignoredFiles = new Set(["asset-manifest.json"]);

async function collectFiles(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(
        `Brand package must not contain symlinks: ${absolutePath}`,
      );
    }
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

function pngDimensions(buffer, relativePath) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error(`Invalid PNG signature: ${relativePath}`);
  }
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

function svgDimensions(buffer, relativePath) {
  const source = buffer.toString("utf8");
  if (
    !source.includes("<svg") ||
    !source.includes("http://www.w3.org/2000/svg")
  ) {
    throw new Error(`Invalid SVG document: ${relativePath}`);
  }
  const width = source.match(/\bwidth="([0-9.]+)"/u)?.[1];
  const height = source.match(/\bheight="([0-9.]+)"/u)?.[1];
  if (!width || !height) {
    throw new Error(`SVG lacks numeric width and height: ${relativePath}`);
  }
  return [Number(width), Number(height)];
}

async function inspectFile(absolutePath) {
  const relativePath = path
    .relative(brandRoot, absolutePath)
    .split(path.sep)
    .join("/");
  const buffer = await readFile(absolutePath);
  const extension = path.extname(relativePath).toLowerCase();
  const entry = {
    path: relativePath,
    bytes: buffer.byteLength,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };

  if (extension === ".png")
    entry.dimensions = pngDimensions(buffer, relativePath);
  if (extension === ".svg")
    entry.dimensions = svgDimensions(buffer, relativePath);
  if (extension === ".json") JSON.parse(buffer.toString("utf8"));

  return entry;
}

async function buildManifest() {
  const files = (await collectFiles(brandRoot)).filter(
    (file) => !ignoredFiles.has(path.basename(file)),
  );
  const entries = [];
  for (const file of files) entries.push(await inspectFile(file));

  return {
    schema_version: 1,
    brand: "Our Poker Table",
    asset_version: "1.0.0",
    license: "Apache-2.0",
    scope: "Every file under assets/brand except asset-manifest.json",
    files: entries,
  };
}

const expected = await buildManifest();

if (process.argv.includes("--write")) {
  await writeFile(
    manifestPath,
    `${JSON.stringify(expected, null, 2)}\n`,
    "utf8",
  );
  console.log(`Wrote ${expected.files.length} entries to ${manifestPath}`);
} else {
  const actual = JSON.parse(await readFile(manifestPath, "utf8"));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(
      "Brand asset manifest does not match the source-controlled package. " +
        "Review the asset change, then regenerate intentionally with --write.",
    );
    process.exitCode = 1;
  } else {
    console.log(
      `Brand asset manifest verified: ${expected.files.length} files.`,
    );
  }
}
