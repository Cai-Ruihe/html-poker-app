/*
 * Operator-owned runtime routing. Keep empty for same-browser development.
 *
 * Set only a deployer-owned Connection Service URL here, for example:
 *
 * globalThis.__HTML_POKER_CONFIG__ = {
 *   privateRelay: { url: "wss://poker-relay.example.invalid" },
 * };
 *
 * Never put POKER_CONNECTION_ACCESS_TOKEN, a relay ticket, or any player
 * invitation secret in this file. The host enters its operator token locally
 * to mint a table-scoped, short-lived relay ticket.
 */
globalThis.__HTML_POKER_CONFIG__ ??= {};
