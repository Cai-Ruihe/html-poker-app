---
id: DESIGN-OUR-POKER-TABLE-BRAND-V1
kind: design-system
status: accepted
owner: Ruihe Cai
accepted_at: 2026-08-17
audience: product, design, frontend, release
asset_version: 1.0.0
update_trigger: owner changes the product name, mark geometry, wordmark, palette, or primary lockups
---

# Our Poker Table brand guidelines

**Our Poker Table** is the accepted product-facing name. The identity should
feel like a quiet, well-made object placed on a real poker table: social,
balanced, and free of casino spectacle. The canonical files live in the
[brand asset package](../../../assets/brand/README.md).

This decision does not rename repository, package, URL, or deployment
identifiers. Those remain `html-poker-app` until a separately reviewed
migration is authorized.

## Brand idea

The mark reuses the product's own corner-and-dot control language. Four exact
rotations suggest one shared table with no permanent “right way up,” matching
the equal-sided Tablet interaction model.

**Fact:** the symbol geometry is a measured trace of the accepted UI corner.
**Inference:** the four-way composition communicates shared-table balance and
connects the brand to the interface. **Unknown:** unaided recognition as a
poker table has not been measured with representative customers.

## Master geometry

The 256-unit symbol master is locked:

- path: `M145 44H186.586A25.414 25.414 0 0 1 212 69.414V110.422`;
- stroke: `8.664` units;
- square terminals;
- dot center: `(212, 122)`;
- dot radius: `6` units;
- rotations: `0°`, `90°`, `180°`, and `270°` around `(128, 128)`.

Do not independently change stroke thickness, radius, arm length, dot size, or
rotation order. Use the supplied vector symbol rather than redrawing it.

## Lockup alignment

The native horizontal lockup is `478 × 114 px`.

- visible symbol bounds: approximately `x 12–101`, `y 12–101`;
- visible symbol center: `y 56.5 px`;
- visible wordmark center: `y 56.5 px`;
- measured vertical-center difference: `0.0 px`;
- visible symbol-to-wordmark gap: `20 px`.

The alignment is optical and based on visible pixels, not the original
wordmark image canvas. Do not move or rescale one lockup element independently.

## Primary configurations

### Light surfaces

Use [`horizontal-light.svg`](../../../assets/brand/svg/horizontal-light.svg):

- surface: Warm Paper `#F5F5F5`;
- symbol: Brand Green `#194C3E`;
- wordmark: Ink `#1D2321`.

### Brand-green surfaces

Use [`horizontal-green.svg`](../../../assets/brand/svg/horizontal-green.svg):

- surface: Brand Green `#194C3E`;
- symbol: UI Gold `#D4B86E`;
- wordmark: Warm Paper `#F5F5F5`.

### In-product watermark

Inside gameplay only, the same geometry may use UI Gold `#D4B86E` at `58%`
opacity on Table Felt `#003F33`. Primary brand marks use full opacity. Branding
must remain subordinate to cards and current play state on the quiet surface.

### Monochrome

The black and white transparent lockups are fallbacks for one-color printing,
engraving, or compliance documents. They are not preferred digital modes.

## Color system

| Token | Hex | Primary role |
| --- | --- | --- |
| Brand Green | `#194C3E` | Brand field and light-surface symbol |
| Table Felt | `#003F33` | Gameplay surface |
| UI Gold | `#D4B86E` | Green-surface symbol and product accent |
| Warm Paper | `#F5F5F5` | Light field and green-surface wordmark |
| Ink | `#1D2321` | Light-surface wordmark and body copy |

Verified contrast ratios:

- Brand Green on Warm Paper: `8.98:1`;
- UI Gold on Brand Green: `5.07:1`;
- UI Gold on Warm Paper: `1.77:1` — disallowed for the primary logo and text.

These logo-pair measurements do not establish contrast compliance for every
future text size or UI state.

## Clearspace and minimum size

Let `d` equal one dot diameter in the rendered symbol. Keep at least `1d` of
clearspace outside the supplied lockup artboard; prefer `2d` on hero and launch
screens.

- standard symbol: `32 px` minimum;
- favicon optical cut: `16–32 px`;
- horizontal lockup: `239 px` minimum width;
- stacked lockup: `185 px` minimum width.

Below the lockup minimum, use the symbol or app icon instead of compressing the
wordmark.

## Typography

The wordmark is fixed artwork. Do not retype, substitute, or recreate it from
a guessed font.

Supporting product typography follows the existing visual system:

- interface and body: Archivo Variable, then Avenir Next, Segoe UI, sans-serif;
- editorial headings, card ranks, and display moments: Georgia, then Times New
  Roman, serif;
- technical labels only: the system monospace stack.

## App, web, and social use

- Primary app icon: gold symbol on Brand Green.
- Light app icon: green symbol on Warm Paper.
- Maskable PWA icon: full-bleed Brand Green with the gold symbol inside the safe
  region.
- Favicon: use the grid-fitted optical cut; do not manually downsample the
  standard master.
- Social avatar: use the primary app icon.
- Social sharing: use the supplied 1200 × 630 Open Graph export.

## Accessibility and implementation

Use the supplied color-paired assets instead of recoloring lockups in code.
Give linked logos an accessible name such as “Our Poker Table home.” Hide a
decorative standalone mark from assistive technology. Do not encode state or
meaning through green and gold alone.

## Misuse

Do not:

- put gold on a light background;
- tighten or exaggerate the UI-derived curve;
- stretch, skew, outline, bevel, glow, or shadow the mark;
- rotate brackets while leaving dots fixed;
- rearrange the four dots;
- move the symbol relative to the wordmark;
- change the wordmark text, spacing, or proportions;
- reduce the primary mark's opacity; or
- place the logo on a busy image without a controlled field.

## Evidence and limits

See [production notes](PRODUCTION-NOTES.md) for measurements and source limits,
and [rights and licensing](RIGHTS-AND-LICENSING.md) for the open-source and
trademark boundary. The asset manifest verifies files and dimensions; it does
not prove customer preference, trademark availability, or large-format print
fidelity.
