# Security policy

Card privacy is the project's highest security priority. Robust Airplane Mode, China operation, and recovery remain important, but they do not justify exposing unrevealed cards or silently overstating the trust model.

## Supported versions

There is no released application yet. Once releases begin, this file will list supported release lines. The local tracer slice has automated projection and public-DOM privacy checks, but it has not passed the independent red-team, physical-device, network, recovery, dependency, or release-integrity gates. Treat it as development evidence, not a supported security claim.

The current preview is local-only and deliberately lets one trusted operator select any seat projection for testing. It has no player credential or network authorization boundary and must not be exposed as a multi-device game until those Phase 1 modules exist.

## Report a vulnerability privately

Do not open a public issue for a suspected vulnerability involving hidden cards, deck order, credentials, session takeover, unauthorized control, dependency compromise, release tampering, diagnostic leakage, or AI-provider data exposure.

Before the first public release, the project owner must enable [GitHub Private Vulnerability Reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository) or publish a dedicated private security address. This is a release blocker. Until that channel exists, contact the repository owner through a private method listed on their GitHub profile and include only enough non-sensitive detail to establish contact.

In a report, include:

- affected version, commit, and mode;
- device, browser, and network conditions;
- impact and who can observe or control what;
- minimal reproduction steps;
- whether unrevealed card data or credentials were accessed; and
- a safe way to continue the private conversation.

Do not include real personal information or data from games you did not have permission to test.

## Disclosure handling

The project will acknowledge a valid private channel report, triage impact, preserve evidence without copying hidden-card data unnecessarily, and coordinate disclosure after a fix or mitigation is available. Exact response-time promises will be added only when maintainer capacity can support them.

Good-faith research should stay within systems and games the researcher owns or is authorized to test, avoid privacy violations and service disruption, and allow a reasonable remediation period before disclosure.

## Trust-model boundary

Phase 1 uses a **Trusted Host**:

- encryption and role projections protect card data from unauthorized peers, network observers, ordinary relays, backups, and diagnostics;
- the active host necessarily controls the deck and can inspect or manipulate it if the host runtime or device is malicious;
- obfuscating host-side state is not treated as cryptographic protection from the host owner;
- host compromise, a modified client, malicious browser extensions, screen capture, and operating-system compromise remain material risks.

A future Mental Poker protocol may reduce host trust, but it is not implemented and must not be implied by the Phase 1 UI or documentation.

## Security invariants

- Secrets are removed at the authoritative projection boundary, not merely hidden by presentation code.
- Unrevealed and mucked cards never enter public histories, cloud checkpoints, telemetry, ordinary logs, or support bundles.
- Relay and signaling services remain card-blind.
- Diagnostics are redacted by construction and retained for no more than the configured 30-day maximum.
- Every release is self-contained, immutable, versioned, and free of runtime third-party code unless an accepted ADR changes that rule.
- Every development phase includes adversarial Card Privacy Red Team checks.

See [Card Custody & Privacy](docs/prd/modules/M02-CARD-CUSTODY-PRIVACY.md), [Diagnostics & Red Team](docs/prd/modules/M08-DIAGNOSTICS-RED-TEAM.md), and [Release & Distribution](docs/prd/modules/M09-RELEASE-DISTRIBUTION.md).
