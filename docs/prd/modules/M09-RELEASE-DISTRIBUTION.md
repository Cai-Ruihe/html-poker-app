---
id: PRD-M09
kind: module
status: current
last_reconciled: 2026-08-14
decision_ids:
  - GOV-LICENCE
  - GOV-OFFICIAL-CORE
  - GOV-CUSTOM-HOST
  - NET-OWNER-ISOLATION
  - NET-VERSION
  - DIST-STATIC-HTTPS
  - SUPPLYCHAIN-IMMUTABLE-RELEASE
  - HOST-CAPABILITY-PREFLIGHT
  - PRIVACY-ZERO-TELEMETRY
  - TEST-IOS-STANDALONE
  - TEST-UPDATE-SUPPLY-CHAIN
router: ../manifest.yaml
---

# M09 — Release and Distribution

## Context capsule

This module turns reviewed source into immutable Official Normal and Airplane artifacts and documents how deployers host/configure them without using Ruihe's infrastructure. Its interface is a release manifest: version, source revision, artifact digests, protocol/rules/schema ranges, provenance, dependency inventory, signatures, migrations, and compatibility. It proves provenance—not that a running host is honest.

## Problem Statement

A static web app is inexpensive to publish, but silent top-level replacement, CDN dependencies, service-worker updates, mixed offline files, leaked relay credentials, and community forks can change card-sensitive code during play or confuse users about trust.

## Solution and Interface

Produce two self-contained release targets from one source revision: an HTTPS Normal build and one standalone Airplane HTML file. Publish immutable artifacts plus verifiable metadata. Hosting and service configuration are injected per deployer. A live table pins its build and activates updates/migrations only when no table is active.

### Owns

- Deterministic build/release contract, artifact naming, versioning, hashes/signatures, SBOM, provenance, and changelog.
- Normal static-hosting package and Airplane single-file package.
- Service-worker staging, migration compatibility, rollback/downgrade defenses, and visible build ID.
- Official Release versus Custom Host labeling and distribution documentation.
- Open-source licence/notices and deployer-owned configuration boundary.

### Does not own

- Application behavior ([M01](M01-GAME-CORE.md)).
- Runtime routes/services ([M04](M04-CONNECTIVITY-SERVICE.md)).
- Airplane pairing ([M05](M05-AIRPLANE-MODE.md)).
- Community Skin package lifecycle ([M11](M11-COMMUNITY-SKINS.md)).

## User Stories

1. As a user, I want to see the exact build/protocol running at my table.
2. As a traveler, I want a verifiable standalone file that never self-updates during a trip/game.
3. As a maintainer, I want one source revision to produce traceable Normal and Airplane artifacts.
4. As an open-source deployer, I want to configure my own domain, signaling, relays, backup, and diagnostics.
5. As Ruihe, I want Official Core/release provenance distinguished from arbitrary compatible forks.
6. As a security reviewer, I want no runtime third-party scripts, fonts, evaluators, QR libraries, analytics, or card assets in the card origin.
7. As a small deployer, I want the Normal build usable from an ordinary free static HTTPS host without turning that host into the poker engine.

## Implementation Decisions

- Use Apache-2.0 for project-owned code and preserve licence/notice obligations. Skin asset licences are separate Phase 3 metadata.
- Keep the Normal build provider-neutral and static-hostable. GitHub Pages or another free tier may be evaluated at deployment, but provider choice remains separate from the Connection Service and must pass the target-region tests.
- Commit lockfiles and pin build inputs. Release metadata includes source revision, build environment/provenance, dependency inventory, artifact digest, signature, build/protocol/rules/schema versions, and release date.
- Treat a new service worker as waiting; never activate/migrate during an active table.
- A signature identifies an artifact from the official process. It cannot attest an unlocked/modified host, extension, operating system, or administrator.
- Official clients may join a Custom Host only after a clear one-time warning. Protocol compatibility is not a fairness guarantee.
- Do not embed Ruihe's server addresses/credentials as public defaults. Provide deployment examples using operator-supplied configuration.
- GitHub publication, branch protection, release signing identity, and hosting provider activation are separate explicit external-operation gates.

## Testing Decisions

Test reproducibility/determinism to the chosen level, dependency/artifact substitution, altered top-level HTML, signature/digest mismatch, downgrade/freeze/mixed assets, service-worker activation during play, incompatible schema migration, revoked builds, Normal/Airplane parity, offline external-request scan, secret scan, licence inventory, and fresh-clone documentation paths.

## Out of Scope

Choosing a final hosting vendor now, subsidizing community infrastructure, remote attestation of the running host, silently auto-updating tables, or publishing to GitHub without explicit authorization/read-back.

## Further Notes

Free static hosting is feasible, but operational readiness depends on domain, China testing, release signing, and optional Connection Service deployment. These are deployment choices, not a central poker backend.
