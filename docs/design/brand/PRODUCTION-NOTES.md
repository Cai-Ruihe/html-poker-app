# Our Poker Table brand production notes

**Status:** verified production record for brand asset version 1.0.0  
**Audience:** designers, implementers, release reviewers  
**Owner:** Ruihe Cai  
**Update trigger:** any approved change to geometry, source artwork, colors,
alignment, or export inventory

## Source authority

The mark was refined against owner-supplied UI and compact-layout references.
The final measurements below preserve the accepted UI corner's thickness,
curvature, length, and four-way compact arrangement. The source screenshots are
not required by consumers and are not duplicated in the open-source package.

Repository references:

- [`apps/web/src/table.css`](../../../apps/web/src/table.css) records the
  product's four-sided corner language and table treatment;
- [`apps/web/src/styles.css`](../../../apps/web/src/styles.css) records the
  current supporting typography and broader visual system;
- [`SHARED-VISUAL-SYSTEM.md`](../SHARED-VISUAL-SYSTEM.md) is the controlling
  product design record.

## Alignment correction

An earlier native lockup placed the visible symbol center at `y = 78.5 px` and
the wordmark center at `y = 64.0 px`, a `14.5 px` mismatch. The accepted native
lockup measures:

- symbol visible center: `y = 56.5 px`;
- wordmark visible center: `y = 56.5 px`;
- absolute difference: `0.0 px`;
- symbol-to-wordmark horizontal gap: `20 px`.

## Geometry verification

The screenshot trace back-projects from the 256-unit master to:

- stroke: `3.75 px`;
- centerline radius: `11.00 px`;
- horizontal span: `29.00 px`;
- vertical span: `28.75 px`.

The half-coverage binary intersection-over-union against the supplied raster
crop was `97.61%`. This is evidence of the measured match, not evidence that the
symbol will communicate the intended meaning to every user.

## Wordmark source limitation

The approved wordmark source is a raster image. Its exact visible silhouette is
preserved in [`assets/brand/source/wordmark/`](../../../assets/brand/source/wordmark/),
and the SVG lockups embed lossless PNG data. This avoids an unverified font
substitution but does not create vector detail.

Recommended bounds:

- screen: use the 478 px native horizontal lockup at no more than its intrinsic
  pixel width, or render it around 239 CSS px on a 2× screen;
- large print: first obtain an original vector wordmark or approved
  font-and-spacing specification;
- never auto-trace and silently present the result as original vector artwork.

No font file is bundled with this brand package.

## Open-source package curation

The repository contains the reusable SVG, PNG, web, social, token, manifest,
and wordmark-source files. It deliberately excludes:

- a duplicate ZIP archive;
- temporary comparison previews and browser-QA screenshots;
- supplied UI crops that are already represented by locked measurements; and
- the original local builder, which depended on machine-specific runtime paths.

The source-controlled manifest is reproducible with
`node tools/branding/verify-brand-assets.mjs --write` and verifiable without
third-party dependencies. The repository does not yet contain a pixel-export
rebuilder; the approved exports themselves are canonical.

## Verification boundary

The recorded checks establish geometry matching, optical alignment, dimensions,
file integrity, contrast calculations, and successful guide rendering at the
time of approval. They do not establish trademark clearance, customer
preference, unaided symbol comprehension, or print fidelity beyond the raster
wordmark's native resolution.
