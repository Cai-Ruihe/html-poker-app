---
id: PRD-M06
kind: module
status: current
last_reconciled: 2026-08-14
decision_ids:
  - PHASE1-TABLE-SIZE
  - NET-DISPLAY-REVERSE-QR
  - MODE-SEPARATION
  - MODE-TABLE-CONTROL
  - SEAT-AUTO-AND-DRAG
  - DEALER-RELOCATION
  - FOLD-UNDO
  - FOLD-SIT-OUT
  - SHOW-IRREVERSIBLE
  - HAND-END-EXPLICIT
  - UI-MINIMAL-RUNNING
  - UI-AESTHETIC
  - UI-BUTTON-ARRANGEMENT
  - REMOTE-PUBLIC-TABLE-P2
  - TEST-TV-BROWSERS
router: ../manifest.yaml
---

# M06 — Presentation and Interaction

## Context capsule

This module renders role-filtered projections as distinct Player, Tablet, TV, Public Table, and Developer experiences. Its interface receives a projection plus allowed intents and emits user intent—not state mutation. The ordinary game must remain classic, elegant, and low-attention; rare administration lives off the main surface.

## Problem Statement

Phones, touch tablets, and distant TVs have different information density and input needs. Combining them into one responsive screen risks tiny TV controls, cluttered phones, accidental dealer actions, and leaked private cards. Poker also needs deliberate physical gestures that do not rush table conversation.

## Solution and Interface

Each mode has its own renderer over a shared semantic design system. Renderers consume only their allowed projection and emit typed intents through a Seat or Table-Control capability. Mode switching changes presentation, never authority.

### Owns

- Player, Tablet, TV, Public Table, and Developer layouts.
- Peek/fold/undo/show/local flip-down interactions and feedback.
- Board reveal, guarded End Hand, seat positioning, dealer relocation UI, and controller roster/revocation UI.
- Classic/elegant default theme, responsive typography, accessibility, and safe skin token consumption.

### Does not own

- Hidden-card filtering ([M02](M02-CARD-CUSTODY-PRIVACY.md)).
- Capability issuance ([M03](M03-IDENTITY-SEATS-CAPABILITIES.md)).
- Command legality ([M01](M01-GAME-CORE.md)).
- Skin package validation ([M11](M11-COMMUNITY-SKINS.md)).

## User Stories

1. As a player, I want to cover and drag to peek without lifting my phone for everyone to see.
2. As a player, I want a simple fold gesture and a visible five-second undo when still safe.
3. As a player, I want full Show to be deliberate and irreversible, while local flip-down tidies my phone.
4. As a group, we want shown cards to remain on the Public Table until next hand.
5. As a tablet dealer, I want board and dealer controls available without a cluttered permanent toolbar.
6. As a TV viewer, I want distance-readable public information and optional non-touch navigation.
7. As a host, I want auto seat layout plus drag-to-match physical seating during play.
8. As a dealer, I want a separate administration route for logical dealer relocation.
9. As a group, we want End Hand to wait for an explicit guarded action even after all-fold.
10. As an accessibility user, I want semantic labels, high contrast, large ranks, reduced motion, and private headphone card reading where supported.
11. As a public-display user, I want one clear mode-switch action to enter or leave Tablet presentation when this device already has Table-Control authority.
12. As a TV user, I want the unpaired screen to show a distance-readable Normal Mode QR so the host can connect it without long remote-control typing.

## Implementation Decisions

- A Public Table can visually switch to Tablet Mode only when the device already holds/redeems Table-Control.
- An unpaired Normal Mode TV/Public display may render its ephemeral reverse-pairing QR and plain-language status; it receives no table projection until an authorized scanner completes pairing.
- The Player cover-and-drag interaction peeks progressively; deliberately dragging through the full-show threshold commits irreversible Show. Afterward, only that player's local screen may flip the cards face-down again.
- Exact button placement and press-hold versus Dealer double-action remain prototype decisions; the outcome—guarded explicit End Hand—is locked.
- Fold is provisional until its safe boundary. Show has no secrecy undo.
- Visual seat movement never changes logical action/dealer/blind order.
- The default style uses original assets and interaction principles inspired by Bold Poker, not copied layouts/artwork.
- Host-selected appearance cannot disable device-local accessibility overrides.
- Names, logs, skin labels, and messages render as text, never executable markup.

## Testing Decisions

Use rendered interaction tests at each mode's public interface plus browser/device tests. Cover common one-hand flow, accidental gesture, multi-touch/scroll conflict, background/resume, tablet orientation, TV distance/input, ten seats, long names, controller revoke, capability denial, VoiceOver/screen readers, headphones, reduced motion, contrast, text scaling, and skin fallback. Measure button count/attention in prototypes before locking layout.

## Out of Scope

One universal layout, chat/social feed, casino animation overload, skin code execution, UI-granted authority, and final Phase 2 accounting controls before its PRD gate.

## Further Notes

Minimalism is evaluated on the 99-percent in-hand surface, not by deleting necessary recovery, correction, security, or accessibility actions from their appropriate secondary surfaces.
