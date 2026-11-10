# Keeper / Guard generation and distribution record

Recorded 2026-11-10 for the repository owner's Phase-01A request. Artwork was generated using the **built-in OpenAI `image_gen.imagegen` service**, not an API-key CLI, a scraped sprite, stock art or a code-drawn replacement. Raw outputs remain alongside this record. `generation-record.json` retains tool invocation IDs, prompts, input/output file hashes and the deterministic derivative chain.

The backend model ID, provider generation seed and billed cost were **not exposed by the built-in tool**; they are unknown, not inferred as a particular GPT Image version. The initial four concept/master calls occurred in the 2026-11-09 session; the two pose-sequence calls occurred on 2026-11-10. The tool's retained filenames identify invocation outputs, not a claimed public provider-job URL. PNGs contain no supplied C2PA/EXIF provenance block; the external record is therefore required.

Only original textual direction and this pair's own generated concepts/masters were submitted. The four protagonist images and the old vendor/Guard files were inspected locally for compatibility but **were not sent as image-generation inputs**. No living artist, another game's assets or protected character design was requested. That describes the authored inputs; it is not a guarantee of model-output uniqueness or a substitute for an originality review.

Official terms checked on 2026-11-10:

- [OpenAI Europe Terms of Use](https://openai.com/policies/eu-terms-of-use/), updated January 16, 2026, Content → Ownership of content / Similarity of content.
- [OpenAI Services Agreement](https://openai.com/policies/services-agreement/), updated December 1, 2025, effective January 1, 2026, §4.1–4.3.

Both describe output ownership as between the customer and OpenAI to the extent permitted by law. They also leave responsibility for inputs/use with the customer; the individual-service terms explain that outputs may be similar to others'. These public terms are supporting records, not proof of this account's negotiated plan, copyright eligibility, exclusivity or an assignment from a human artist. No third-party license or attribution was invented.

**Provenance disposition: cleared for project use/distribution under the retained provider output-ownership terms, to the extent permitted by law.** Reviewer: Codex provenance audit, 2026-11-10. This decision rests on the recorded original-input chain, actual inspected outputs and current primary terms, not on a file being generated or committed. The ten new source/runtime PNGs have named source/creator, explicit supporting terms, hashes and a complete derivative chain. No outside image, artist name, recognizable third-party logo, signature or requested protected character design appears in that chain.

This is a limited project-use determination, not an opinion about exclusive copyright, output uniqueness or an uninspected account/order-form exception. The service did not expose its backend model version; that traceability limitation remains recorded. Final **artistic** acceptance still requires human review. Existing protagonist/environment/audio provenance remains unchanged; the pre-existing 45 unverified distributed files still block the repository's public-release gate.

## Derivation

1. Keeper textual design → `keeper-concept-v1.png` (rejected realistic proportions/halo).
2. Keeper concept → edited compact `keeper-master.png`.
3. Guard textual design + Keeper master as style-only reference → `guard-concept-v1.png`.
4. Guard concept → `guard-master.png`, distinct age/face/hair.
5. Each master + its stored pose prompt → its own 16-pose candidate source.
6. Source pose PNG + `registration.json` + character atlas contract → fixed-scale registered runtime atlas/neutral PNG via `utils/build-character-atlases.mjs`.

The normalization pipeline does not invent poses or erase components. It removes negligible native-alpha fringe, area-samples color with coverage, creates binary runtime alpha and positions whole drawings using one source scale and inspected ground lines. Rejected density tests and earlier framing views are retained under the evidence directory. Human artistic decisions are not recorded as approved until a named reviewer supplies them.
