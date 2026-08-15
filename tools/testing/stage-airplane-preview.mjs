import { copyFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

await copyFile(
  path.join(root, "dist", "airplane", "poker-airplane.html"),
  path.join(root, "dist", "normal", "__airplane-test.html"),
);
