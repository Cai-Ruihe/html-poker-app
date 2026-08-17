# Project governance

## Purpose

This project welcomes issues, research, documentation, code, tests, security reviews, and community skins while keeping the official game core coherent and auditable.

## Roles

- **Project Owner / Lead Maintainer:** Ruihe Cai. Holds final product, security-risk, Official Core, Official Release, maintainer, and official-repository decisions.
- **Maintainers:** trusted contributors explicitly appointed for named areas. Their review and any delegated non-core merge permissions are least-privilege and revocable.
- **Contributors:** anyone proposing work through issues, discussions, reviews, or pull requests.
- **Security reviewers:** maintainers or designated reviewers who may block a release when a card-privacy or supply-chain gate fails.

The owner may delegate non-core decisions, but delegation must be written and scoped. Approval of an Official Core change or Official Release remains with the Project Owner. Maintainer status is earned through sustained, reviewable contributions and sound handling of security boundaries.

## Official Core and forks

“Official Core” means code accepted into and released from the owner-designated repository, currently [`Cai-Ruihe/our-poker-table`](https://github.com/Cai-Ruihe/our-poker-table). It is a governance and provenance designation, not a restriction on the Apache-2.0 licence.

Apache-2.0 allows independent parties to copy, modify, redistribute, and use the project commercially under its terms. They do not need permission to change their forks. Those changes do not enter, control, or represent the official repository without Project Owner approval, and the licence does not grant rights to project names or trademarks beyond customary attribution.

## How decisions are made

1. Ordinary documentation, tooling, and data-only skin changes follow accepted authority and may be approved within a maintainer's written delegated scope.
2. Every Official Core change requires Project Owner approval after the required maintainer and security reviews.
3. Product-direction changes require the Project Owner and an updated decision-register entry.
4. Cross-module or difficult-to-reverse technical choices require an accepted ADR.
5. Card-privacy, release-integrity, authentication, diagnostics, or provider-boundary changes require a security review and may be blocked despite feature approval.
6. A failed named feasibility or red-team test may reopen an accepted decision. Preference alone does not rewrite history.

Evidence should separate facts, inferences, and unknowns. Established industry or inspected open-source practice may supply an ordinary default; consequential conflicts, novel trust assumptions, and irreversible trade-offs go to the owner.

## Pull requests and releases

- No contributor can merge their own security-sensitive change without another qualified review, and no Official Core change merges without Project Owner approval.
- The public repository exists, but protected branches, required checks, signed or provenance-verifiable releases, and least-privilege maintainer access remain launch/release gates. A repository rename or Pages-route migration does not satisfy them.
- Releases are cut only from reviewed commits and must satisfy the phase gates in [ROADMAP.md](ROADMAP.md) and the [release checklist](docs/releasing/RELEASE-CHECKLIST.md).
- The owner may decline a change that is correct in isolation but weakens coherence, accessibility, privacy, maintainability, or the minimal table experience.

## Community skins

Once the Phase 3 schema exists, contributors may propose data-only skins to the official repository. Each skin must pass schema, asset-rights, accessibility, performance, and non-executability validation. Official inclusion is discretionary; compatible skins may also be distributed independently under their own lawful terms.

## Amendments

Governance changes require a pull request, a stated rationale, owner approval, and a changelog entry. Material changes should preserve the previous rule in the decision history.
