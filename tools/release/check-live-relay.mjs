import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { readFile, stat } from "node:fs/promises";
import { isIP } from "node:net";

const relayValue = process.env.NORMAL_CONNECTION_SERVICE_URL?.trim();
const appOrigin = process.env.NORMAL_APP_ORIGIN?.trim();
const allowHttpLoopback = process.env.RELAY_CHECK_ALLOW_HTTP_LOOPBACK === "1";
const operatorTokenFile = process.env.RELAY_OPERATOR_TOKEN_FILE?.trim();
const timeoutCandidate = Number.parseInt(
  process.env.RELAY_CHECK_TIMEOUT_MS ?? "10000",
  10,
);
const timeoutMs =
  Number.isSafeInteger(timeoutCandidate) &&
  timeoutCandidate >= 1_000 &&
  timeoutCandidate <= 30_000
    ? timeoutCandidate
    : 10_000;

function fail(message) {
  throw new Error(`Live relay release gate failed: ${message}`);
}

function serviceUrl(pathname) {
  if (!relayValue) fail("NORMAL_CONNECTION_SERVICE_URL is required.");
  let url;
  try {
    url = new URL(relayValue);
  } catch {
    fail("NORMAL_CONNECTION_SERVICE_URL is invalid.");
  }
  const loopback =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "::1";
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    fail("NORMAL_CONNECTION_SERVICE_URL must contain only its secure origin.");
  }
  if (url.protocol === "wss:") {
    url.protocol = "https:";
  } else if (
    allowHttpLoopback &&
    loopback &&
    (url.protocol === "ws:" || url.protocol === "http:")
  ) {
    url.protocol = "http:";
  } else {
    fail(
      "the relay must use wss:// (HTTP is allowed only for loopback tests).",
    );
  }
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  return url;
}

async function checkedFetch(url, init = {}) {
  try {
    return await fetch(url, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const primary = error instanceof Error ? error.message : "network error";
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? `: ${error.cause.message}`
        : "";
    const reason = `${primary}${cause}`;
    fail(`${url.hostname} is unreachable (${reason}).`);
  }
}

function headerTokens(response, name) {
  return (response.headers.get(name) ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

async function main() {
  if (!appOrigin) fail("NORMAL_APP_ORIGIN is required.");
  let applicationUrl;
  try {
    applicationUrl = new URL(appOrigin);
  } catch {
    fail("NORMAL_APP_ORIGIN must be one exact HTTPS origin.");
  }
  if (
    applicationUrl.protocol !== "https:" ||
    applicationUrl.username ||
    applicationUrl.password ||
    applicationUrl.pathname !== "/" ||
    applicationUrl.search ||
    applicationUrl.hash
  ) {
    fail("NORMAL_APP_ORIGIN must be one exact HTTPS origin.");
  }
  const origin = applicationUrl.origin;

  const healthUrl = serviceUrl("/health");
  if (isIP(healthUrl.hostname) === 0 && healthUrl.hostname !== "localhost") {
    try {
      await lookup(healthUrl.hostname);
    } catch {
      fail(`${healthUrl.hostname} does not resolve in DNS.`);
    }
  }

  const healthResponse = await checkedFetch(healthUrl, {
    headers: { accept: "application/json" },
  });
  if (!healthResponse.ok) {
    fail(`GET /health returned HTTP ${healthResponse.status}.`);
  }
  const health = await healthResponse.json().catch(() => undefined);
  if (health?.status !== "ok") {
    fail('GET /health did not return { status: "ok" }.');
  }

  const sessionsUrl = serviceUrl("/v1/table-sessions");
  const preflight = await checkedFetch(sessionsUrl, {
    headers: {
      "access-control-request-headers": "authorization,content-type",
      "access-control-request-method": "POST",
      origin,
    },
    method: "OPTIONS",
  });
  if (preflight.status !== 204) {
    fail(`table-session preflight returned HTTP ${preflight.status}.`);
  }
  const allowedOrigin = preflight.headers.get("access-control-allow-origin");
  const allowedHeaders = headerTokens(
    preflight,
    "access-control-allow-headers",
  );
  const allowedMethods = headerTokens(
    preflight,
    "access-control-allow-methods",
  );
  if (allowedOrigin !== origin) {
    fail(`CORS allows ${allowedOrigin ?? "no origin"}, not ${origin}.`);
  }
  if (
    !allowedHeaders.includes("authorization") ||
    !allowedHeaders.includes("content-type") ||
    !allowedMethods.includes("post")
  ) {
    fail("CORS does not allow the table-session request.");
  }

  const rejection = await checkedFetch(sessionsUrl, {
    body: JSON.stringify({
      hostKey: `release-gate-host-${randomUUID()}`,
      protocolVersion: 2,
      tableId: `release-gate-table-${randomUUID()}`,
    }),
    headers: {
      authorization: "Bearer release-gate-intentionally-invalid-token",
      "content-type": "application/json",
      origin,
    },
    method: "POST",
  });
  const rejectionBody = await rejection.json().catch(() => undefined);
  if (rejection.status !== 401 || rejectionBody?.code !== "access-denied") {
    fail("the relay did not reject an invalid operator token with HTTP 401.");
  }

  let operatorTokenAcceptance;
  if (operatorTokenFile) {
    const tokenMetadata = await stat(operatorTokenFile).catch(() => undefined);
    if (!tokenMetadata?.isFile()) {
      fail("RELAY_OPERATOR_TOKEN_FILE is not a readable regular file.");
    }
    if ((tokenMetadata.mode & 0o077) !== 0) {
      fail(
        "RELAY_OPERATOR_TOKEN_FILE must not be accessible by group or others.",
      );
    }
    const operatorToken = (await readFile(operatorTokenFile, "utf8")).trim();
    if (operatorToken.length < 16 || operatorToken.length > 512) {
      fail("the operator token file has an invalid value.");
    }
    const acceptance = await checkedFetch(sessionsUrl, {
      body: JSON.stringify({
        hostKey: `release-gate-host-${randomUUID()}`,
        protocolVersion: 2,
        tableId: `release-gate-table-${randomUUID()}`,
      }),
      headers: {
        authorization: `Bearer ${operatorToken}`,
        "content-type": "application/json",
        origin,
      },
      method: "POST",
    });
    const ticket = await acceptance.json().catch(() => undefined);
    if (
      acceptance.status !== 201 ||
      typeof ticket?.accessToken !== "string" ||
      ticket.accessToken.length < 16 ||
      ticket.accessToken.length > 512 ||
      !Number.isSafeInteger(ticket.expiresAt) ||
      ticket.expiresAt <= Date.now()
    ) {
      fail(
        "the relay did not accept the operator token and issue a valid ticket.",
      );
    }
    operatorTokenAcceptance = "ok";
  }

  process.stdout.write(
    `${JSON.stringify({
      cors: "ok",
      health: "ok",
      invalidTokenRejection: "ok",
      ...(operatorTokenAcceptance ? { operatorTokenAcceptance } : {}),
      relayOrigin: healthUrl.origin,
      status: "ready",
    })}\n`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown failure.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
