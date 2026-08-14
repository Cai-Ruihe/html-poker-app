---
id: PRD-M11
kind: module
status: deferred
last_reconciled: 2026-08-14
decision_ids:
  - GOV-COMMUNITY-SKINS
  - UI-AESTHETIC
  - SKINS-PHASE-3
  - TEST-SKINS
router: ../manifest.yaml
---

# M11 — Community Skins

## Context capsule

Phase 3 Community Skins are declarative appearance packages validated against a versioned manifest. The module's interface resolves semantic design tokens/assets for a renderer or rejects/falls back safely. Skins cannot execute code, read game state, alter interactions/rules, load runtime third parties, or disable local accessibility settings.

## Problem Statement

The open-source community should be able to create visual identities without forking security-sensitive core code. Traditional plug-ins, arbitrary CSS/HTML/JavaScript, and remote assets can exfiltrate cards, obscure controls, or break accessibility.

## Solution and Interface

Accept a package containing a manifest, declared licence metadata, semantic tokens, and bounded local assets. Validate schema/version, content hashes, MIME/size/dimensions, renderer coverage, contrast/accessibility, and signature/provenance where applicable. Return a safe resolved theme or the official default.

### Owns

- Skin manifest/schema, asset policy, validation, compatibility, hashes, licences, and fallback.
- Semantic colors, typography, spacing, motion, sounds, card faces/backs, felt/background, seat frames, and renderer variants.
- Host-selected shared appearance plus device-local accessibility overrides.

### Does not own

- Renderer behavior/interaction ([M06](M06-PRESENTATION-INTERACTION.md)).
- Release trust for Official Core ([M09](M09-RELEASE-DISTRIBUTION.md)).
- Arbitrary modules, game logic, projection access, or AI styles.

## User Stories

1. As a skin author, I want a documented schema and preview/validation feedback.
2. As a host, I want to select one shared visual identity for the table.
3. As a player, I want my accessibility overrides to remain active under any skin.
4. As a maintainer, I want malformed/incompatible skins to fall back without stopping play.
5. As Ruihe, I want community skin submissions without granting Official Core merge authority.
6. As a commercial/open-source user, I want clear code and asset licence boundaries.

## Implementation Decisions

- No JavaScript, HTML, executable CSS, remote URL, state selector, event handler, arbitrary prompt, or executable binary.
- Use semantic tokens rather than DOM selectors; renderers choose how a token maps to a platform/mode.
- Validate size, count, MIME, dimensions, duration, audio behavior, contrast, readability, reduced motion, and required safe fallback.
- Official-repository skin contribution and distribution/gallery policy are decided when Phase 3 begins. Apache-2.0 for code does not automatically license third-party art.
- A host cannot disable high contrast, larger ranks, four-color cards, reduced motion, mute, or other local accessibility controls.

## Testing Decisions

Schema/property tests, malicious file corpus, decompression/size limits, MIME confusion, SVG/script injection, path traversal, remote-load detection, hash mismatch, missing renderer variant, contrast/readability, reduced motion, audio mute, ten-seat layouts, and deterministic fallback. Security tests assert no game/private-state object is reachable through the skin interface.

## Out of Scope

Core plug-ins, arbitrary themes executing code, gameplay mods, remote asset CDNs, skin marketplaces/payments, and final asset-licence/submission policy before Phase 3.

## Further Notes

The seam is reserved from Phase 1 through semantic design tokens, but community package loading is not implemented until Phase 3.
