# L3 adversarial verification — code-shape C5

**Claim (C5):** B's claimed contract seam does not hold; the enforcement grep documented in
three files has a false negative for exactly the directory that violates it; no test enforces
the seam. Plus: `engine/index.js:27` hard-imports the concrete domain singleton, shadowing its
own `domain` parameter, so status primitives are wired to the real V4 domain and the 69
synthetic-fixture engine tests "pass only by accident of id non-collision".

**Verdict: AMENDED.** The central assertions survive. Two of the supporting details are wrong,
and the claim *understates* the seam breach in two ways.

---

## What I verified

### 1. The doc quote is real and means what the claim says

- `contract.js:1-11` — "Contract — the seam between the logical model … and the browser layer
  (controllers + templates). **Controllers and templates only call functions on this module.**"
- `obligations.md:1876-1892` goes further: "**Nothing in `features/`, `lib/`, or `templates/`
  imports from `obligations/`, `domain/`, `engine/`, or `flow/` directly.** Enforceable by grep:
  `grep -rn "from '../engine\|from '../domain\|from '../flow" features/ lib/ | grep -v contract`
  … **should return nothing**."
- Same grep at `NEXT.md:121` (and again at `NEXT.md:1091`) and the prose version at
  `RECOMMENDATION.md:344-351` ("No controller reads `engine/index.js` or `domain/index.js`
  directly … only `contract.js` and `state.js` do").

So it is documented in **four** places, not three, and the strongest wording (obligations.md)
is an unqualified factual claim about the code.

### 2. The seam is breached — and by more than the claim says

Violating imports outside `contract.js` (non-test files):

| File | Line | Import |
|---|---|---|
| `features/check-your-answers/controller.js` | 26 | `from '../../obligations/obligations.js'` |
| `features/check-your-answers/controller.js` | 27 | `from '../../domain/index.js'` |
| `features/commodity-lines/controller.js` | 20 | `from '../../obligations/obligations.js'` |
| `features/commodity-lines/controller.js` | 21 | `from '../../flow/flow.js'` |
| `features/commodity-lines/controller.js` | 22 | `from '../../domain/index.js'` |
| `features/units/controller.js` | 21 | `from '../../obligations/obligations.js'` |
| `features/units/controller.js` | 22 | `from '../../flow/flow.js'` |
| `features/units/controller.js` | 23 | `from '../../domain/index.js'` |
| `features/hub/controller.js` | 15 | `from '../../engine/index.js'` (`firstApplicablePage`, `firstUnfulfilledPage`, `STATUSES`) |
| `features/hub/controller.js` | 16 | `from '../../obligations/obligations.js'` |
| `lib/build-field-descriptors.js` | 15 | `from '../domain/index.js'` |
| `lib/build-field-descriptors.js` | 16 | `from '../engine/index.js'` |
| `lib/line-page-controller.js` | 25 | `from '../obligations/obligations.js'` |
| `lib/unit-page-controller.js` | 28 | `from '../obligations/obligations.js'` |
| `lib/presentation.js` | 58 | `from '../obligations/obligations.js'` |

That is **15** violating import lines across **8** files — the claim said nine across four.

Two of these bypasses are *substantive*, not cosmetic: `features/hub/controller.js:11-15` pulls
`firstUnfulfilledPage` / `firstApplicablePage` / `STATUSES` straight from the engine because
`contract.js` exposes only whole-journey `startPage(state)` (contract.js:101-111) and no
`STATUSES` re-export. `features/check-your-answers/controller.js:27` pulls the `domain` singleton
because the contract exposes no value-rendering / domain-entry accessor. The seam is not merely
un-policed — it is **under-specified for what the browser layer actually needs**.

### 3. The grep has a false negative — and also a false *positive* nobody ran

- **False negative (claim is right):** the pattern is `from '../engine` etc. Feature controllers
  are two directories deep and write `from '../../domain/index.js'`. Regex `from '../domain`
  expands to `from '` + any + any + `/domain`; against `from '../../domain` the two wildcards eat
  `..` and the next char is `/`, not the start of `/domain`. No match. All 10 `features/`
  violations are invisible to it. Confirmed by running the pattern verbatim.
- **The claim misses a bigger embarrassment:** run verbatim from the spike root, the documented
  grep **already returns two hits** —
  `lib/build-field-descriptors.js:15` and `:16`. Neither path contains the string `contract`, so
  `| grep -v contract` does not filter them. The doc's own check, executed today, **does not
  return nothing**. obligations.md:1892 is falsified on its own terms, without needing the
  depth argument at all. Nobody has ever run it.
- **Second hole:** the pattern does not include `obligations/` at any depth, even though
  obligations.md:1882 explicitly lists `obligations/` as forbidden. Six further violations
  (`lib/line-page-controller.js:25`, `lib/unit-page-controller.js:28`, `lib/presentation.js:58`,
  plus the three feature controllers) are structurally ungreppable by the published command.

### 4. No enforcement mechanism exists — confirmed

- No test reads source files: `grep -rln --include="*.test.js" "readFileSync"` over the whole
  spike → **no matches**. There is no import-boundary assertion in `contract.test.js`,
  `integration.test.js` or anywhere else.
- No lint rule: no `no-restricted-imports`, `import/no-restricted-paths`,
  `eslint-plugin-boundaries`, `dependency-cruiser` or `madge` in the repo's `eslint.config.js`
  or `package.json`.

### 5. The domain-singleton coupling — real, but the claim describes it backwards

- `engine/index.js:27` — `import { domain } from '../domain/index.js'` at module scope. Real.
- **The shadowing runs the other way.** Inside `optionsFor` (`:41`) and `validate` (`:61`) the
  *parameter* `domain` shadows the module import, so the import is **inert** in exactly the two
  functions the claim names. Those two are genuinely injectable, and `engine/index.test.js:34-57`
  builds a synthetic `domain` Map and passes it to them.
- The import is live in **`isValueFulfilled` (`:318-324`)**, which takes no domain argument. It is
  reached from `hasFulfilment` (`:326-343`) → `pageStatus` / `containerStatus` / `journeyState` /
  `firstUnfulfilledPage*`. **None of those five take a `domain` parameter at all.** So the claim's
  conclusion — every status primitive is hard-wired to the real V4 domain and cannot be injected —
  is correct, and is a stronger point than "shadowing": it is a *missing seam*, not a name clash.
- **"Pass only by accident of id non-collision" is wrong.** Collision is structurally impossible:
  the real domain Map is keyed by obligation `.id`, and those ids are **UUIDs**
  (`obligations.js:707` → `permanentAddress.id = '3fcbd0e6-…'`; the map at
  `domain/index.js:1150-1190` is `[permanentAddress.id, permanentAddressDomain]` etc.). Every
  engine fixture uses a human-readable id (`'reason'`, `'addr'`, and at `:768` even the
  deliberately-suggestive `'permanent-address'`, which is **not** the real id). So
  `domain.get(...)` returns `undefined` in *every* status-primitive test, deterministically.
- **The real defect is sharper than the claim states.** Because the fixtures always miss,
  `isValueFulfilled`'s address branch (`entry.isComplete(value)`) is **never executed by any engine
  unit test** — it always falls through to `isBlankValue`. And `engine/index.test.js:451-468`
  ("singleton composite with one sub-field filled → F") asserts that a partially-filled composite
  is **FULFILLED**. For a *real* address obligation that is the **opposite** of what the code does:
  `addressBlock`'s `isComplete` (`domain/index.js:201-210`) returns `false` unless every `required`
  sub-field is non-blank, so a real partial address is **not** fulfilled. The engine's unit suite
  therefore encodes address semantics that contradict production behaviour. Real address ids appear
  only in `routes.test.js` — not in `contract.test.js` or `integration.test.js`.
- Also `it()` count is **63** in `engine/index.test.js`, not 69.

### 6. Counter-example hunt: is this an A-advantage? No.

A's `prototypes/standalone/live-animals/features/**` imports `engine/` directly in ~20 controller
files (`features/hub/controller.js`, `check-answers/controller.js`, `addresses/controller.js`, …),
and A has no source-reading boundary test either (`grep -rln readFileSync` over A's `shared/` and
`engine/` → no matches). So "no enforced seam" is **symmetric**. What is *asymmetric* is that B's
docs (three files, four occurrences) assert the seam holds and ship a verification command that has
never been run; A makes no such claim. This is a doc-honesty defect specific to B, and a shared
retrofit item (one `readFileSync`-based import-boundary test, or an `eslint-plugin-boundaries` rule)
for whichever model wins.

---

## Retrofit cost

Low, both sides. One boundary test (~30 lines: walk `features/**` + `lib/**`, regex any
`from '(\.\./)+(obligations|domain|engine|flow)/'`, allowlist `contract.js`) plus growing the
contract by three functions (`STATUSES` re-export, per-container `firstUnfulfilledPage`, a
`valueFor(obligationId, …)` domain accessor for CYA). Making the status primitives take an
injected `domain` is a signature change across five functions plus `contract.js` — half a day, and
it is what would let the engine be unit-tested against a synthetic domain honestly.
