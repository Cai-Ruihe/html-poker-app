# Phase 1 local release candidate

**Status:** Local candidate record, not an official release. **Audience:** the project owner and reviewers. **Update when:** the candidate changes or a listed external gate obtains dated evidence.

## Candidate scope

This candidate implements the Phase 1 trusted-host digital-dealer slice: physical chips only; two to ten player seats; card/privacy projections; QR/link capabilities; Normal direct/relay connectivity; reverse public-display pairing; standalone Airplane pairing; local encrypted recovery; diagnostics; and off-table administration. It excludes digital accounting, real money, remote-first human play, automatic host migration, skins, and AI seats.

## Local evidence to run and record

```sh
pnpm check
pnpm test:coverage
pnpm test:e2e
pnpm audit:prod
pnpm licenses:prod
pnpm release:reproducibility
```

After committing the exact candidate and building it, create the ignored local receipt:

```sh
pnpm release:manifest
pnpm release:verify
```

The manifest contains the source revision, package-manager/Node metadata, lockfile digest, build/protocol version, and a SHA-256 entry for every Normal and Airplane artifact file. It deliberately does not sign an artifact or publish anything.

## Release blockers still outside this repository run

| Gate | Status | Why it is not claimed |
|---|---|---|
| Physical device/browser matrix | Open | Local browser emulation and a synthetic camera QR stream are not actual iOS/iPadOS, Android, TV, camera, file-opening, backgrounding, or storage evidence. The current headless Mobile WebKit `file://` probe produced no local ICE candidate after eight seconds, so Chromium—not a fabricated WebKit pass—supplies the automated direct-pairing evidence. |
| WAN-removed Airplane matrix | Open | A desktop `file://` journey does not prove hotspot behavior, client-isolation detection, or two-to-ten real devices plus public display. |
| Normal network/TURN/reconnect matrix | Open | Direct local candidates and local relay fallback do not establish NAT, TURN, network switch, long suspend, service restart, or throughput behavior. |
| Initial-load performance | Open | The current Normal JavaScript bundle is about 826 KB before compression (about 230 KB gzip) and emits the bundler's large-chunk warning. No device/network performance budget has been measured, so it is not a supported performance claim. |
| China readiness | Open | No dated representative mainland network measurements exist. |
| Independent Card Privacy Red Team | Open | Automated regressions exist; an independent frozen-candidate review does not. |
| Supply-chain release approval | Open | Audit/licence commands are local evidence only; no release signing identity, SBOM/provenance attestation, or owner approval is configured. |
| GitHub/security operations | Partial | Public source, an owner-authorized Pages field build after CI, Private Vulnerability Reporting, dependency alerts, and automatic security fixes are active. Protected branch rules, release signing, and a monitored response-time commitment remain open. |

## Honest label

Call this a **local Phase 1 release candidate** only. Do not call it “released,” “production-ready,” “China-ready,” “Airplane-supported,” or “secure against a malicious host” until the corresponding release checklist evidence is complete and owner-approved.
