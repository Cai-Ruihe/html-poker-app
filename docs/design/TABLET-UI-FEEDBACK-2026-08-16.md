---
id: DESIGN-TABLET-UI-2026-08-16
kind: design-feedback-record
status: implementation-authorized
owner: Ruihe Cai
recorded_at: 2026-08-16
audience: product, design, frontend, qa
implementation_authorized: true
update_trigger: owner approval of a Tablet UI revision or a material workflow change
---

# Tablet UI and shared-table visual feedback

This document records the owner's feedback from the Phase 1 Tablet UI review.
It preserves the design intent, rejected patterns, proposed resolutions, and
remaining validation gates in one place.

This record is **Accepted design direction with production implementation
authority granted by the owner on 2026-08-16**. It does not override the PRDs,
decision register, accepted ADRs, or tests. The accepted decisions are
reconciled into their normative owners before production behavior changes.

## Evidence language

- **Owner-set:** directly stated or explicitly retained by the owner.
- **Proposed:** a design resolution shown for review but not yet approved.
- **Rejected:** explicitly rejected by the owner; do not reintroduce without a
  new reason and review.
- **Test-gated:** direction is accepted, but its field suitability remains
  unverified until the named test passes.
- **Unknown:** evidence is not yet sufficient to treat the behavior as settled.

## Design thesis

**Owner-set:** the Tablet is placed in the center of a physical poker table.
Players sit around it, so no side may be treated as the default or privileged
viewpoint. The experience should feel as intuitive and restrained as Bold
Poker's physical-table interaction model without copying its artwork.

The quiet surface has one job: make the community cards immediately legible.
Controls and management information appear only on demand.

## Decision ledger

| ID      | Status    | Decision                                                                                                                                                                            |
| ------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TUI-001 | Owner-set | In quiet mode, community cards receive nearly all visual attention and may use almost the full iPad width.                                                                          |
| TUI-002 | Rejected  | Do not persistently show a `Board` heading, `n / 5 cards`, application header, table outline, oval, decorative divider, or player tiles.                                            |
| TUI-003 | Owner-set | Keep four tiny, low-contrast gold corner callouts with large invisible touch targets.                                                                                               |
| TUI-004 | Owner-set | A corner callout opens controls for the player seated on that side. Both upper-corner panels and all their text face the upper side.                                                |
| TUI-005 | Owner-set | The quick layer contains only `Next card`, `Next hand`, an icon-only three-dot control, and Close.                                                                                  |
| TUI-006 | Owner-set | `Next card` sits beside `Next hand`, has a large target, and advances the board by one card.                                                                                        |
| TUI-007 | Owner-set | `Next hand` deliberately ends the current hand even if the board is incomplete; it uses a short physical slider, not an ambiguous `END` control.                                    |
| TUI-008 | Owner-set | After the host acknowledges `Next card` or `Next hand`, the quick panel closes automatically. On failure it stays open with recovery guidance.                                      |
| TUI-009 | Owner-set | The slider's outer track radius matches the circular handle radius; its three grip ribs are vertical to imply horizontal friction.                                                  |
| TUI-010 | Owner-set | The Next-hand slider should require a short deliberate drag rather than a long sweep.                                                                                               |
| TUI-011 | Owner-set | The three-dot control has no `More` label. Dots and Close must be easy to touch and visually separated.                                                                             |
| TUI-012 | Rejected  | Do not leave unused trailing space in the `Next hand` container after shortening the slider.                                                                                        |
| TUI-013 | Owner-set | Rare controls open in a centered second-level panel. Player management and theme selection do not belong in the quick layer.                                                        |
| TUI-014 | Rejected  | Do not show a lock icon, pseudo-unlock affordance, or explanatory authority line on the quiet surface. Unsupported controls are simply absent.                                      |
| TUI-015 | Owner-set | Dealer, small blind, and big blind markers remain visible in quiet mode, are larger than status glyphs, and use distinct colors.                                                    |
| TUI-016 | Owner-set | Holding, folded, winner, offline, and sitting-out states require low-key seat-edge indicators rather than persistent player panels.                                                 |
| TUI-017 | Owner-set | Holding uses two slightly fanned face-down card silhouettes. Two vertical bars are rejected because they resemble Pause.                                                            |
| TUI-018 | Rejected  | A broken red ring is not an intuitive offline symbol.                                                                                                                               |
| TUI-019 | Owner-set | Cards use an old-school, highly legible face with aligned mirrored indices and restrained dimensional rendering.                                                                    |
| TUI-020 | Owner-set | Preserve the warm ivory paper gradient, subtle inner bevel/rule, and soft depth shadow used in the approved card direction.                                                         |
| TUI-021 | Owner-set | Support Dark Green, Black Gold, and Deep Navy table themes. Black Gold means black with gold lines.                                                                                 |
| TUI-022 | Owner-set | The host-selected table theme synchronizes to every player and display, so everyone experiences the same table.                                                                     |
| TUI-023 | Superseded | System dark-mode inversion is not a supported appearance control. Phones and Tablets follow the host-selected table scheme so warm cards and table colors remain intentional.           |
| TUI-024 | Owner-set | A downloaded card skin may use compact vector assets, but an offline/Airplane fallback must remain built in.                                                                        |
| TUI-025 | Owner-set | Remove Muck from the ordinary player flow; retain Fold.                                                                                                                             |
| TUI-026 | Owner-set | Player and display surfaces should reconnect automatically after app switching or background suspension, with an explicit reconnect action when automatic recovery cannot complete. |
| TUI-027 | Rejected  | A detached gold line plus a competing panel outline looks awkward and low quality.                                                                                                  |
| TUI-028 | Owner-set | The gold accent should extend through the rounded fillet as one continuous path; other panel outlines are removed or subordinated.                                                  |
| TUI-029 | Rejected  | The gold fillet may not taper to a hairline at its curved midpoint; vertical, curve, and horizontal sections need consistent visual weight.                                         |
| TUI-030 | Accepted  | Revision v6, including the corrected uniform-weight gold fillet, is the approved Tablet UI/UX direction.                                                                            |
| TUI-031 | Accepted  | Dark Green, Black Gold, and Deep Navy use identical cards, state, geometry, and controls so only the color system changes.                                                          |
| TUI-032 | Owner-set | A quiet status glyph follows its owner’s physical seat; it must not counter-rotate into a screen-upright, unexplained 90-degree card icon.                                            |
| TUI-033 | Owner-set | A showdown changes emphasis, not the public-table map: the community board keeps its quiet-mode size/location, revealed hands remain at their owners’ edges, and the explanation sits below the board. |
| TUI-034 | Owner-set | Tablet/TV panels touch their selected screen edges. Safari native-exit protection is relevant only during actual iPad page fullscreen and may not introduce permanent or broad clearance. |
| TUI-035 | Owner-set | The iOS Home Screen icon uses an opaque, full-bleed brand source; a repaired icon URL is versioned, while existing shortcuts are re-added during physical verification.                 |

## Quiet table surface

### Cards

The board is the dominant object. Five community cards should occupy almost the
entire usable width without colliding with seat-edge status indicators. A four-
card board remains centered when the quick controls are open.

The default deck is an old-school vector treatment:

- warm ivory paper rather than pure white;
- subtle diagonal/radial shading that gives the card physical depth;
- a restrained inner rule and soft table shadow;
- large conventional rank and suit marks;
- correctly aligned, mirrored lower indices;
- red hearts/diamonds and near-black clubs/spades.

**Privacy constraint:** if future skins are downloaded, fetch and cache a
complete deck pack before play. Do not fetch individual card assets after a
deal, because per-card requests can reveal the board through network metadata.
Airplane Mode always has a complete built-in simple vector deck.

### Seat-edge status vocabulary

| State       | Visual language                                       | Authority                                  |
| ----------- | ----------------------------------------------------- | ------------------------------------------ |
| Holding     | Two small, slightly fanned face-down cards facing the owner’s physical seat | Owner-set                     |
| Folded      | The same cards, dimmed and crossed                    | Owner-set direction                        |
| Winner      | The same cards with a restrained gold highlight/spark | Owner-set direction                        |
| Offline     | A small phone outline with a red disconnect slash     | Proposed replacement for the rejected ring |
| Sitting out | A small empty-chair outline                           | Proposed; requires comprehension testing   |

Do not put player names, seat cards, `ACTIVE`, or `FOLDED` panels on the quiet
surface. The physical position around the Tablet supplies identity; the symbol
supplies current state.

### Dealer and blinds

- `D`: muted gold token.
- `SB`: cool blue/silver token.
- `BB`: warm copper token.

The letter labels remain because color alone is insufficient. Tokens rotate to
the reading orientation of their side.

## Synchronized theme samples

The three accepted schemes retain identical structure and card treatment. The
v6 theme tokens are:

| Theme      | Felt      | Deep felt | Panel     | Primary accent         | Primary control text contrast |
| ---------- | --------- | --------- | --------- | ---------------------- | ----------------------------- |
| Dark Green | `#003f33` | `#002b23` | `#001f19` | antique gold `#d4b86e` | 7.44:1                        |
| Black Gold | `#060806` | `#010202` | `#020302` | warm gold `#d0ad59`    | 14.44:1                       |
| Deep Navy  | `#071a30` | `#020812` | `#020a15` | steel blue `#86a8c8`   | 10.05:1                       |

The comparison render uses the same four-card board, open lower-right control
panel, player states, dimensions, and 4px fillet stroke for every theme. The
ratios compare ivory primary control text with that theme's primary action
surface; all exceed 4.5:1. Production still needs component-level contrast QA.

## Corner interaction model

Four visually quiet corner callouts share the same interaction priority and
touch-target size. The callout is deliberately smaller than its hit area.

When opened, the panel grows inward from that corner and remains flush to its
selected screen edges:

- lower-left and lower-right panels face the lower side;
- upper-left and upper-right panels, including labels, arrows, slider, dots,
  and Close, rotate 180 degrees to face the upper side;
- no panel assumes that the person operating it is below the Tablet.

During actual iPad page fullscreen, the native Safari exit affordance is a
system control rather than part of the product. Protect only the empirically
observed native-exit corner and only for that state. Do not reserve empty
clearance in ordinary Tablet, TV, or non-fullscreen pages, and do not move an
entire panel away from its edge.

### Showdown stability

Revealing a hand must not shrink, relocate, or reflow the community cards.
Shown hole cards remain adjacent to the corresponding edge indicator; side
hands may move along that same edge to avoid covering a community card. The
single best-hand explanation is placed directly below the unchanged board.

The panel uses one signature decoration: a gold thread starts beyond the
rounded inner corner, traces the full fillet, and continues along the panel
edge. It is not paired with a second full outline. Its stroke remains visibly
uniform through the curve rather than thinning at the diagonal midpoint.

### Quick controls

The controls are adjacent rather than stacked:

1. **Next card** — one large button; the whole surface is tappable.
2. **Next hand** — a short drag control that may end a hand before all five
   community cards are revealed.

Prototype geometry to validate rather than treat as production constants:

- Next-hand slider travel: 80–110px; revision v6 uses 92px.
- Slider track radius: 32px.
- Slider handle radius: 32px.
- Three-dot and Close target: at least 48px; revision v6 uses 52px.
- Visual gap between three-dot and Close: 16–20px; revision v6 uses 20px.
- Gap between `Next card` and `Next hand`: revision v6 uses 18px.

The Next-hand container hugs its slider and label. It must not retain the width
of an earlier long-drag design.

## Centered second-level controls

The centered panel is intentionally allowed to occupy the visual center because
opening it means the table is already in a rare management or recovery state.
It may contain:

- Players and seats: invitations, seat order, dealer, and device replacement.
- Displays and pairing: Tablet, TV, and public-table screens.
- Connection and recovery: reconnect, relay ticket, void, and correction.
- Appearance: Dark Green, Black Gold, and Deep Navy.
- This device: Host Controls, My Hand, and Table View.
- Diagnostics and history: Hand ID, saved log, and Developer Mode.

Capability filtering remains implicit. A Host device receives host categories;
a paired display receives only its authorized subset. The visual design does
not grant or imply additional authority.

## Adjacent player and recovery requirements

The player phone is commonly also the host phone. The Host Controls surface
therefore needs a direct `Join my own table` action. A host iPad also needs a
direct switch to Table View.

App switching is ordinary behavior, especially on iOS. Host, player, and public
display clients should attempt automatic recovery when foregrounded. If the
host was suspended, dependent screens should wait and reconnect instead of
concluding immediately that the saved table is unusable. A visible `Reconnect`
action remains available when automatic recovery cannot complete.

These recovery requirements are product behavior, not proven by the v6 visual
prototype.

## Rejected patterns

Do not reintroduce these patterns without a material new reason and owner review:

- permanent `Board` title or board-card counter;
- table ovals and decorative white outlines;
- persistent player cards or management information in quiet mode;
- controls readable from only one side of a physically shared Tablet;
- ambiguous `END`, lock, pause-bar, or broken-ring symbols;
- tiny three-dot or Next-card targets;
- `More` text beside the three dots;
- a long Next-hand drag or an empty tail after the drag is shortened;
- detached gold trim that stops before the rounded panel fillet;
- theme and player management on the first-level quick panel.

## Revision v6 evidence

Revision v6 is a conversation-local approval prototype rendered at 1366 × 1024.
It is not checked into the production application and does not prove physical
iPad suitability.

Browser-render evidence from 2026-08-16:

- quiet view: five 234 × 334 cards, no horizontal or vertical overflow;
- lower controls: 20px utility gap, 18px action gap, 374px Next-hand container,
  equal 32px track/handle radii, and 92px slider travel;
- both upper panels: complete content transform of 180 degrees, with the same
  spacing and slider geometry;
- all control views: 52px utility targets and an active continuous gold path;
- interaction check: upper-left callout → three dots → centered controls → Close
  returned to the quiet table.

The v6 visual resolutions for offline and sitting-out symbols are approved as
the design direction; first-use comprehension remains a field-test gate.

## Implementation status and field gates

1. **Passed 2026-08-16:** owner approved the complete Tablet revision-v6 visual
   direction and three-theme system.
2. **Passed 2026-08-16:** accepted decisions were reconciled into M06 and the
   decision register, then implemented through production code and automated
   Chromium/Mobile WebKit journeys. Prototype code was not promoted.
3. Verify from all physical seating sides on an actual iPad.
4. Verify corner reach without moving the Tablet.
5. Verify text/card legibility under normal room glare and low-light dark mode.
6. Verify that new users identify Holding, Folded, Winner, Offline, Sitting out,
   `D`, `SB`, and `BB` without instruction.
7. Verify that the short Next-hand drag prevents accidental activation while
   remaining easy for players with different reach and dexterity.

## Current unknowns

- Whether the proposed phone-with-slash offline symbol is immediately understood.
- Whether the proposed empty-chair sitting-out symbol is immediately understood.
- Whether 92px is the best final drag distance on every supported iPad size.
- Whether the four quiet corner callouts remain discoverable in varied lighting.
- Which exact iPad Safari corner contains the native page-fullscreen exit on
  the supported physical orientation/browser combination; the targeted
  fullscreen regression is a browser simulation until field-verified.
- Whether the centered second-level information density is appropriate on the
  smallest supported Tablet viewport.
- Whether the current application and relay architecture satisfy the separate
  recovery requirements under iOS background suspension.
