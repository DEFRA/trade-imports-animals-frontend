# EUDPA-249 — obligation-model comparison

A structural comparison of the two independently-built prototypes of the live-animals
import-notification journey, on two branches of this repo that diverged at `16e391f`:

- **Side A — "live-animals"** (`spike/EUDPA-249-prototype-layouts`), at `prototypes/standalone/live-animals/`
- **Side B — "flow-layer"** (`spike/EUDPA-249-flow-layer`), at `prototypes/journey-config-spikes/EUDPA-249-flow-layer/` (plus `prototypes/model-spikes/obligations-v4-model/`)

Produced by a multi-agent analysis: 16 dimensions read independently on each side, compared,
then every material claim adversarially verified against source. 96 claims verified
(17 refuted, 79 amended); 12 structural asymmetries confirmed across both directions.

## Read these

- **[BRIEF.md](BRIEF.md)** — one page. The call, keep/keep/bin lists, migration order and cost. Start here.
- **[REPORT.md](REPORT.md)** — the long-form argument: 16 dimensions with `file:line` evidence, retrofit analysis both directions, where each side is demonstrably wrong.
- **[MATRIX.md](MATRIX.md)** — the capability grid and the structural-asymmetry table.

## Audit trail

`state/` holds the full evidence chain behind every conclusion — the per-dimension deep reads
(`L1-*`), comparisons (`L2-*`), adversarial refutations (`L3-*`) and asymmetry hunts (`L4-*`).

## Headline

Neither model is a superset of the other. Dimension tally **8 B-better / 8 mixed / 0 A-better**
on model quality — but A wins one structural property (static analysability) that no dimension
grants it. Recommendation: **build on B's obligations model, port A's gate data-vocabulary in,
take A's persistence and parity harness.** A's greater completeness is a build loop pointed at
it, not model quality, and is scored out throughout.
