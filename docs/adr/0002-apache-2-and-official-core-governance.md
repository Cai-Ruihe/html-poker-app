# ADR-0002: Apache-2.0 and Official Core governance

- **Status:** Accepted
- **Date:** 2026-08-14
- **Decider:** Project Owner
- **Scope:** Repository, contributions, releases, skins
- **Decision IDs:** `GOV-LICENCE`, `GOV-OFFICIAL-CORE`, `GOV-COMMUNITY-SKINS`

## Context

The owner wants broad participation, forks, attribution, and commercial reuse while preventing unreviewed or malicious changes from entering or representing the official core.

## Evidence

### Facts

- Apache-2.0 permits modification, redistribution, and commercial use under its conditions and includes an express patent grant.
- An open-source licence cannot prohibit people from changing their own forks while remaining open source.
- Repository permissions, protected branches, review requirements, signed/provenance-verifiable releases, and project naming distinguish official artifacts from forks.

### Inference

Licence freedom and official-release control solve different problems and should be governed independently.

### Unknowns

The final project name, trademark strategy, GitHub organization, maintainer identities, and release-signing mechanism are not selected.

## Decision

Project-owned code and documentation use Apache-2.0 unless a clearly identified third-party asset or document has compatible separate terms. `CODE_OF_CONDUCT.md` is an attributed Contributor Covenant adaptation under CC BY-SA 4.0. Anyone may fork, modify, redistribute, or use the Apache-licensed work commercially under its terms. Only owner-approved changes merge into and release from the designated Official Core repository. Data-only community skins may be proposed for official inclusion after their schema exists.

## Consequences

Commercial adoption and broad contribution are allowed without individual permission. Governance cannot stop modified forks; it can protect only official repository authority, provenance, naming, and release channels. Third-party asset rights need an auditable inventory.

## Alternatives considered

- **MIT:** simpler, but lacks Apache-2.0's explicit patent terms and NOTICE mechanism.
- **Non-commercial or no-modification licence:** conflicts with the accepted participation and commercial-reuse goal and would not be open source under the common definition.
- **Contributor self-merge:** rejected for the official repository because card fairness and privacy need reviewed authority.

## Security and privacy effect

Open code improves auditability but does not make every fork trustworthy. Official builds must be reproducible/provenance-verifiable, and custom hosts/builds require clear trust labeling.

## Validation and revisit trigger

Before public launch, configure branch protection, least-privilege teams, private security reporting, release provenance, third-party notice generation, and final naming. Revisit if a dependency or asset cannot be distributed compatibly.
