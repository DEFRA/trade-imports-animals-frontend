# L3 adversarial verification — testing-strategy claim T6

**Claim (T6):** B's i18n-coverage gate does NOT catch "add an obligation, forget the copy" — narrower than B's own write-up implies; a new obligation renders with a humanised fallback and no test fires. Separately, B's documented claim that `contract.js` is the only browser→model path is false and untested.

**Verdict: AMENDED.** Both mechanisms verified in source. One sub-clause ("narrower than B's own write-up implies") is wrong for i18n and *understated* for the contract seam.

All paths relative to
`clone-flow-layer/prototypes/journey-config-spikes/EUDPA-249-flow-layer/`.

---

## 1. The i18n half — mechanism CONFIRMED, framing AMENDED

### Cited evidence checks out

- `lib/presentation.js:419-427` — `forObligation()` does `OBLIGATION_KEYS.get(obligation.id)`; on miss it returns `{ pageTitle: humaniseId(obligation.name), legend: humaniseId(obligation.name), hint: null }`. No throw, no dotted path. `humaniseId` (`:401-408`) camel-splits + sentence-cases, so `insurancePolicyNumber` → "Insurance policy number" — a *plausible-looking* label that ships silently.
- `i18n-coverage.test.js:89-101` — `collectPresentationKeys()` iterates `OBLIGATION_KEYS.values()` / `PAGE_KEYS.values()`. It walks keys that are **already declared**. An obligation absent from the map contributes zero keys, so the gate has nothing to fail on.
- `i18n-coverage.test.js:37-76` — `HUB_KEYS` (13), `CYA_KEYS` (6), `COMMODITY_LINES_KEYS` (13) are hand-maintained literal arrays, with the in-file admission at `:31-36`: *"Keep in sync with the `t()` calls in those files."* Confirmed verbatim.
- `OBLIGATION_KEYS` is a hand-maintained `new Map([...])` at `lib/presentation.js:69-385`. (`grep -c pageTitleKey` = 44 including PAGE_KEYS + docblock, so ~40 entries — the claim's "38" is close enough; not material.)

### Counter-example hunt — what I searched, what I found

`grep -rn "OBLIGATION_KEYS"` across the whole spike: **the only non-doc importer is `i18n-coverage.test.js:26`.** No test asserts "every obligation presented in `flow/flow.js` has an `OBLIGATION_KEYS` entry". `routes.test.js`, `contract.test.js`, `integration.test.js`, `e2e-walk.test.js` contain no `walkPages()`-driven title assertions (grep for `walkPages|pages()|humanise` in those files returns nothing). So a new obligation, wired to domain + presented on a page but missing from `OBLIGATION_KEYS`, ships green with a humanised label. **The mechanism is real.**

I also found a *second, unclaimed* hole in the same family: `contract.js:275-282` does
`const key = descriptor.errors?.required; message: key ? t(key) : t('errors.defaultRequired')`.
Omit the `errors` block from a `mandatoryToProceed: true` presents entry entirely and the required-error copy silently degrades to a generic default — `collectFlowKeys()` (`i18n-coverage.test.js:78-87`) only pushes `entry.errors.required` **if it exists**. Same shape of gap, one layer down.

### Where the claim overreaches

**(a) B *does* gate "add an obligation and forget to wire it" — just not on the copy axis.**
`obligations/coverage.test.js:80-106` fails any obligation lacking *both* a `domain/index.js` entry and a `KNOWN_UNWIRED` allow-list entry, plus two anti-drift guards (allow-list can't contain wired obligations; can't contain orphans). `docs/testing.md` mutation 5 is *precisely* "add a new obligation, leave it unwired" and records it as closed by that test. So "no test fires" is only true for the narrow case where domain + flow *are* wired and only the presentation copy is skipped.

**(b) The uncaught copy surface is bounded, not total.** The gate genuinely does walk:
- section/subsection `titleKey` and presents `errors.required` from `flow/flow.js` (`:78-87`, `:126-140`)
- domain enum `labels` values from `domain/index.js` (`:103-113`, `:158-172`)
- address sub-field label keys (`:115-124`)
- `FORMAT_ERROR_KEYS`, `CHROME_KEYS` (`:190-221`)

So an added *enum* obligation with labels, or an added section, is partially covered. The hole is specifically **page title / legend / hint** (`OBLIGATION_KEYS`) and **omitted-entirely `errors` blocks**.

**(c) "narrower than B's own write-up implies" is not supported.** I went looking for the overclaim and could not find it — B's write-up is precise on this point:
- `RECOMMENDATION.md:206-208` — "i18n-coverage.test.js **covering every declaration-site key**". Declaration-site. Accurate.
- `docs/add-an-obligation.md:109-111` — "will fail **if any key referenced** from flow.js, presentation.js, or the domain manifest is missing from en.json". Accurate.
- `i18n-coverage.test.js:1-21` docblock — enumerates exactly the sources walked, and says "Extend when a new key-carrying property is added".
- `lib/presentation.js:9-11` — **explicitly documents the humaniseId fallback**: "When no entry exists for an obligation, `humaniseId` is the fallback".
- `docs/testing.md` mutation 16 (`:593-618`) — records presentation-copy drift as a **known, deliberately deferred gap** ("Gap — not closed... UX territory").

The one place the docs *do* mislead is `docs/add-an-obligation.md:113` / `:1067` — "Missing keys also render as their raw dotted-path in the browser (visible red flag)". For a *missing `OBLIGATION_KEYS` entry* that is false: you get a clean humanised label, not a red flag. That's the honest version of the "write-up overclaims" charge, and it's much smaller than T6 states.

**Net:** the gap is real and worth a shopping-list line (one test: every obligation reachable from `flow/flow.js` presents must have an `OBLIGATION_KEYS` entry; plus every `mandatoryToProceed` presents entry must carry `errors.required`). It is *not* an undocumented gap, and it is *not* the full "add-and-forget" gap — that one is closed.

---

## 2. The contract-seam half — CONFIRMED, and stronger than claimed

### The documented claim

- `RECOMMENDATION.md:75-78` — "**Correctness is enforced three ways** — contract seam (`contract.js` is the only path from browser → model)". Verbatim, real.
- `obligations.md:1878-1892` states it harder: "**Nothing in `features/`, `lib/`, or `templates/` imports from `obligations/`, `domain/`, `engine/`, or `flow/` directly.** Enforceable by grep: `grep -rn "from '../engine\|from '../domain\|from '../flow" features/ lib/ | grep -v contract` should return nothing."

### The code

`grep -rn "engine/index.js\|obligations/obligations.js" features/ lib/ routes.js`:

| File | Line | Direct model import |
|---|---|---|
| `features/hub/controller.js` | 11-15 | `firstApplicablePage, firstUnfulfilledPage, STATUSES` from `engine/index.js` |
| `features/hub/controller.js` | 16 | `commodityLine` from `obligations/obligations.js` |
| `features/check-your-answers/controller.js` | 22-26, 27 | `obligations/obligations.js`, `domain/index.js` |
| `features/commodity-lines/controller.js` | 15-20, 21, 22 | `obligations/obligations.js`, `flow/flow.js`, `domain/index.js` |
| `features/units/controller.js` | 16-21, 22, 23 | `obligations/obligations.js`, `flow/flow.js`, `domain/index.js` |
| `lib/line-page-controller.js` | 25 | `obligations/obligations.js` |
| `lib/unit-page-controller.js` | 28 | `obligations/obligations.js` |
| `lib/presentation.js` | 17-58 | `obligations/obligations.js` |
| `lib/build-field-descriptors.js` | 15, 16 | `domain/index.js`, `engine/index.js` |
| `routes.js` | 15 | `obligations/obligations.js` |

That is **9-10 files**, not 7 — the claim *undercounts*.

### Two extra findings the claim missed

1. **The doc's own enforcement grep is broken.** Its pattern omits `obligations/` entirely — the single most-violated module — and its `from '../engine` form only matches one-level-up imports, so it structurally cannot see the two-level `from '../../engine/index.js'` in `features/`. Yet even so, **run today it returns 2 hits** (`lib/build-field-descriptors.js:15-16`). The doc's own check fails against its own tree.
2. **No lint enforcement.** `grep -rn "restricted" eslint.config.js` (repo root) → nothing. No `no-restricted-imports`, no import-boundary test anywhere in the spike.

### Fair mitigation (does not rescue the claim, but is worth carrying)

Most leaks are shallow: the `obligations/` imports pull *obligation identity objects* (`commodityLine`, `unitRecord`) to pass as arguments back into contract functions, not model logic. The `engine/` leak in `hub/controller.js` is two nav primitives + a `STATUSES` enum that `contract.js` could trivially re-export (it already exports `statusOfPage/Container/Journey`, `startPage`). So the seam is *leaky, not absent*, and closing it is a re-export + one lint rule — but "one lint rule closes it" is glib: the rule fires red until ~10 files are refactored and `contract.js` grows an id/enum re-export surface. Call it half a day, not a one-liner.

---

## Amended claim

See `amendedClaim` in the structured output.
