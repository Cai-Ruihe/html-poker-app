import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const broadConnectPolicy = "connect-src 'self' https: wss:;";
const localQrImagePolicy = "img-src 'self' data: blob:;";

function validatedServiceUrl(candidate) {
  if (!candidate) {
    throw new Error("NORMAL_CONNECTION_SERVICE_URL is required.");
  }
  let service;
  try {
    service = new URL(candidate);
  } catch {
    throw new Error("The Normal Connection Service URL is invalid.");
  }
  if (service.protocol !== "wss:") {
    throw new Error("The Normal Connection Service must use wss://.");
  }
  if (
    service.username ||
    service.password ||
    service.pathname !== "/" ||
    service.search ||
    service.hash
  ) {
    throw new Error(
      "The Normal Connection Service URL must contain only its wss:// origin.",
    );
  }
  return service.origin;
}

export async function configureNormalBuild(
  root = process.cwd(),
  candidate = process.env.NORMAL_CONNECTION_SERVICE_URL,
) {
  const serviceOrigin = validatedServiceUrl(candidate);
  const httpsOrigin = serviceOrigin.replace(/^wss:/u, "https:");
  const normalDirectory = path.join(root, "dist", "normal");
  const htmlPath = path.join(normalDirectory, "index.html");
  const configPath = path.join(normalDirectory, "poker-config.js");
  const html = await readFile(htmlPath, "utf8");
  if (!html.includes(broadConnectPolicy)) {
    throw new Error(
      "The Normal artifact no longer contains the expected baseline connect-src policy.",
    );
  }
  if (!html.includes(localQrImagePolicy)) {
    throw new Error(
      "The Normal artifact CSP must allow blob: images for local QR scans.",
    );
  }
  const configuredHtml = html.replace(
    broadConnectPolicy,
    `connect-src 'self' ${httpsOrigin} ${serviceOrigin};`,
  );
  const config = `/* Generated at deployment. Contains no operator secret. */\nglobalThis.__HTML_POKER_CONFIG__ = {\n  privateRelay: { url: ${JSON.stringify(serviceOrigin)} },\n};\n`;
  await Promise.all([
    writeFile(htmlPath, configuredHtml, "utf8"),
    writeFile(configPath, config, "utf8"),
  ]);
  return { httpsOrigin, serviceOrigin };
}

async function main() {
  const { serviceOrigin } = await configureNormalBuild();
  process.stdout.write(`Configured Normal build for ${serviceOrigin}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Normal configuration failed."}\n`,
    );
    process.exitCode = 1;
  });
}
