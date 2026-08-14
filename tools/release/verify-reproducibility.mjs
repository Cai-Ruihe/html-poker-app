import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import { collectReleaseManifest } from "./create-manifest.mjs";

const execFile = promisify(execFileCallback);

async function build(root) {
  await execFile("pnpm", ["build"], {
    cwd: root,
    env: process.env,
    maxBuffer: 16 * 1024 * 1024,
  });
}

const root = process.cwd();
await build(root);
const first = await collectReleaseManifest(root);
await build(root);
const second = await collectReleaseManifest(root);

if (JSON.stringify(first.artifacts) !== JSON.stringify(second.artifacts)) {
  throw new Error(
    "Two consecutive Phase 1 builds produced different artifact digests.",
  );
}
process.stdout.write(
  "Two consecutive Phase 1 builds produced identical artifacts.\n",
);
