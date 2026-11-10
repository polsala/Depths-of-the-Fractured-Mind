# Main cast and hands — source and distribution record

Recorded 2026-11-10 for the repository owner's Phase-01B instruction. New source artwork was generated with the built-in OpenAI `image_gen` service. It was not produced by a code-drawn substitute, scraped sprite, stock photograph or outside character pack. Full prompts, actual local tool-output IDs, source hashes and reference chains are retained in the cast generation record, individual master metadata and [presence generation record](presence/generation.json). Runtime derivatives are reproducibly built by `utils/build-hero-atlases.mjs` and `utils/build-presence-atlases.mjs` using their checked contracts and registration records.

The source chain starts with the already documented original-input Phase-01A Guard master as a **style-only** reference, then the four new original protagonist masters. Canonical names, archetypes and institutional costume descriptions come from project design documents. The older protagonist source images were inspected locally for identity continuity; they were not submitted as generation inputs. The four hand sets use only the newly generated protagonist masters and the new Elias hand sheet. No living artist, another game's artwork, protected third-party character, logo or signature was requested.

The built-in tool did not expose its backend model/version, provider seed or billed cost. Those values remain unknown. Tool output filenames identify actual generated local outputs and are not fabricated public provider-job links. PNG source metadata is preserved as delivered; external hash/prompt/reference records carry the auditable chain.

Raw outputs contain `caBX` JUMBF/C2PA containers, retained byte-for-byte in the original source PNGs. [Metadata observations](metadata-observations.json) record container hashes and generic ChatGPT/`gpt-image` software-agent labels; they do not infer a backend model version or claim cryptographic certificate/signature validation. Runtime normalization strips those containers, so its build/source hash records explicitly link each derivative to the retained original.

Official provider pages freshly checked on 2026-11-10:

- [Europe Terms of Use](https://openai.com/policies/eu-terms-of-use/), updated January 16, 2026, Content sections on input responsibility, output ownership and similarity.
- [OpenAI Services Agreement](https://openai.com/policies/services-agreement/), updated December 1, 2025, effective January 1, 2026, §4.1–4.4.

The [retained terms observations](terms-support.json) record the limited supporting basis: as between the customer and OpenAI, output ownership is assigned to the customer to the extent permitted by law; the customer retains responsibility for inputs/use, and outputs may resemble others. No negotiated account exception was inspected. No exclusivity, unique output or copyright-eligibility guarantee is asserted.

**Disposition:** the ledger's new original-input files and deterministic derivatives document a project-use/distribution basis under the retained provider output terms, to the extent permitted by law. Reviewer: Codex provenance audit, 2026-11-10. This is a scoped source-chain determination, not human artistic acceptance, an originality guarantee or a blanket clearance of the repository. Human character-family, anatomy and acting approval remains open.

The replacement hero atlas paths previously represented unverified legacy derivatives. Their old file-level ledger records are preserved as superseded history; the old source sheets remain separately inventoried and unverified. The new `docs/art/hero-reference-phase01b.png` is a sibling of the retained legacy contact sheet, whose status remains unverified. A replacement file's new source chain does not clear its predecessor. Environment, audio and other retained unverified media continue to block public release. No publication, commit or push is part of this phase.
