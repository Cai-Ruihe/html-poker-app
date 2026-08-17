import { readFileSync } from "node:fs";

type OperatorEnvironment = Readonly<Record<string, string | undefined>>;

function validToken(value: string): boolean {
  return value.length >= 16 && value.length <= 512;
}

export function resolveOperatorAccessToken(
  environment: OperatorEnvironment = process.env,
): string {
  const inlineToken = environment.POKER_CONNECTION_ACCESS_TOKEN?.trim();
  const tokenFile = environment.POKER_CONNECTION_ACCESS_TOKEN_FILE?.trim();
  if (inlineToken && tokenFile) {
    throw new Error(
      "Set only one of POKER_CONNECTION_ACCESS_TOKEN or POKER_CONNECTION_ACCESS_TOKEN_FILE.",
    );
  }
  let token = inlineToken;
  if (tokenFile) {
    try {
      token = readFileSync(tokenFile, "utf8").trim();
    } catch {
      throw new Error(
        `POKER_CONNECTION_ACCESS_TOKEN_FILE is not a readable token file: ${tokenFile}`,
      );
    }
  }
  if (!token || !validToken(token)) {
    throw new Error(
      "Set POKER_CONNECTION_ACCESS_TOKEN_FILE or POKER_CONNECTION_ACCESS_TOKEN to a 16-512 character secret.",
    );
  }
  return token;
}
