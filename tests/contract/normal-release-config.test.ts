import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { runInNewContext } from "node:vm";

import { afterEach, describe, expect, it } from "vitest";

const execute = promisify(execFile);
const roots: string[] = [];
const configureScript = path.join(
  process.cwd(),
  "tools",
  "release",
  "configure-normal.mjs",
);
const baselineCsp =
  "connect-src 'self' https: wss:; font-src 'self'; form-action 'self'; img-src 'self' data: blob:;";

async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "html-poker-normal-config-"));
  roots.push(root);
  const normal = path.join(root, "dist", "normal");
  await mkdir(normal, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(normal, "index.html"),
      `<meta http-equiv="Content-Security-Policy" content="${baselineCsp}">`,
      "utf8",
    ),
    writeFile(
      path.join(normal, "poker-config.js"),
      "globalThis.__HTML_POKER_CONFIG__ ??= {};\n",
      "utf8",
    ),
  ]);
  return root;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe("Normal release configuration", () => {
  it("binds the static artifact to one exact HTTPS/WSS service origin", async () => {
    const root = await fixture();

    await execute(process.execPath, [configureScript], {
      cwd: root,
      env: {
        ...process.env,
        NORMAL_CONNECTION_SERVICE_URL: "wss://relay.example.test",
      },
    });

    const [html, config] = await Promise.all([
      readFile(path.join(root, "dist", "normal", "index.html"), "utf8"),
      readFile(path.join(root, "dist", "normal", "poker-config.js"), "utf8"),
    ]);
    expect(config).toContain(
      'privateRelay: { url: "wss://relay.example.test" }',
    );
    const browser = { globalThis: {} as Record<string, unknown> };
    runInNewContext(config, browser);
    expect(browser.globalThis).toEqual({
      __HTML_POKER_CONFIG__: {
        privateRelay: { url: "wss://relay.example.test" },
      },
    });
    expect(html).toContain(
      "connect-src 'self' https://relay.example.test wss://relay.example.test;",
    );
    expect(html).not.toContain("connect-src 'self' https: wss:;");
    expect(html).toContain("img-src 'self' data: blob:;");
  });

  it("rejects an insecure public Connection Service URL", async () => {
    const root = await fixture();

    await expect(
      execute(process.execPath, [configureScript], {
        cwd: root,
        env: {
          ...process.env,
          NORMAL_CONNECTION_SERVICE_URL: "ws://relay.example.test",
        },
      }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining("wss://"),
    });
  });

  it("rejects an artifact that would block a locally selected QR image", async () => {
    const root = await fixture();
    const indexPath = path.join(root, "dist", "normal", "index.html");
    await writeFile(
      indexPath,
      `<meta http-equiv="Content-Security-Policy" content="${baselineCsp.replace(" blob:", "")}">`,
      "utf8",
    );

    await expect(
      execute(process.execPath, [configureScript], {
        cwd: root,
        env: {
          ...process.env,
          NORMAL_CONNECTION_SERVICE_URL: "wss://relay.example.test",
        },
      }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining("blob:"),
    });
  });
});
