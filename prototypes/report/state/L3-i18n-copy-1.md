# L3 — adversarial verification — i18n-copy — CLAIM C1

**Claim:** A has literally zero i18n infrastructure (no locale catalogue, no resolver, no
coverage gate) under `prototypes/standalone/live-animals`; B has all three (`lib/i18n.js`
82 LOC, `locales/en.json` 362 leaf keys, `i18n-coverage.test.js` 221 LOC hard-failing on a
missing declaration-site key). A's copy is inline English (119 literals / 32 `.njk`); B's 8
`.njk` (299 LOC) hold zero user-facing literals, invariant at `shared/page.njk:5`.

**VERDICT: AMENDED.**

Every cited line is real and means what the claim says. Inside the boundary the claim draws
(`prototypes/standalone/live-animals`) its A-side negative survives every attempt to break it.
**But the boundary is drawn one directory too tight.** A complete, wired, tested i18n layer —
resolver + catalogue + catalogue-contract gate, all three — exists **on side A's own branch**, in
the direct predecessor spike that live-animals grew out of, and **B's own layout template credits
that spike as its source**. "A has literally zero i18n infrastructure" is true of the *directory*
and false of the *side*. The distinction is not pedantry: everything L2 hangs on C1 — *"A's version
destroys the seam"*, *"side A contributes **nothing** to a third-option content model except a
cautionary tale"* — is refuted by A's own git tree.

---

## 1. Cited-source verification — all citations real, no fabrication

| Cited fact | Result |
|---|---|
| A: `find` for `*locale*` / `*i18n*` / `en.json` under live-animals returns nothing | **TRUE.** Widened to `*translat* *messages* *copy* *content* *reason* *label* *text*` — the only hits are `t2-hub-copy.test.js` (a literal-*pinning* test, the inverse of a gate), `features/import-reason/`, `services/import-reason-purpose/`, `shared/change-context.test.js`. No catalogue, no resolver. |
| A: no resolver, no coverage gate | **TRUE** within live-animals. `engine/` has no `reasons.js` — the engine emits **no message codes** (`ls engine/` → evaluate, journey, persistence, read, status, store, write + tests). |
| A: 32 `.njk` | **TRUE** — `find … -name "*.njk"` = exactly 32 files, 1,499 LOC. |
| A: 119 user-facing literals | **Right order of magnitude, if anything conservative.** A deliberately narrow grep for macro-arg literals only — `(text\|html\|label\|legend\|caption\|hint):\s*"[A-Z]…"` — returns **113**, *before* counting bare prose in `<p>`/`<h1>` text nodes. |
| B: `lib/i18n.js` = 82 LOC resolver | **TRUE** (`wc -l` = 82). `t()` (:47-53), `tOrNull()` (:61-67), `interpolate()` (:69-75), `hasKey()` (:80-82); `en.json` `readFileSync`-ed once at module scope (:24-27). |
| B: `locales/en.json` = 362 leaf keys | **TRUE.** 584 lines; `grep -cE '^\s*"[^"]+"\s*:\s*"'` = **362** exactly. |
| B: `i18n-coverage.test.js` = 221 LOC, hard-fails on a missing declaration-site key | **TRUE.** Six `describe` blocks, each ending `expect(missing, …).toEqual([])` — a real hard fail. Automatic walks: `collectFlowKeys` (:78-87), `collectPresentationKeys` (:89-101), `collectDomainLabelKeys` (:103-113), `collectAddressSubFieldKeys` (:115-124), plus `FORMAT_ERROR_KEYS`, `CHROME_KEYS`. Each block carries a "collects at least one key" guard against a silent walk regression. |
| B: 8 `.njk` (299 LOC), zero user-facing literals; invariant at `shared/page.njk:5` | **TRUE.** 8 files, 299 LOC. I grepped all 8 for `text:` / `html:` / prose and read them: every value is a view-model binding (`chrome.serviceName`, `resetButtonText`, `unit.deleteButtonText`, `addButtonText`, `stillNeededHtml`). The only quoted string is `{ text: '' }` (`fields.njk:28`) — an empty fieldset legend, not copy. `page.njk:5` reads *"Zero hardcoded copy."* and **the code honours it.** |

One precision note the claim itself gets right but a reader will over-read: the gate covers
**declaration sites**, exactly as worded. It does **not** cover all `t()` call sites — `HUB_KEYS` /
`CYA_KEYS` / `COMMODITY_LINES_KEYS` are hand-typed (`:37-76`, *"Keep in sync with the `t()` calls"*),
there is no `UNITS_KEYS` despite 15 `t()` calls in `features/units/controller.js`, and there is no
orphan-key check in either direction. Already recorded in L2; not a defect in C1's wording.

---

## 2. THE COUNTER-EXAMPLE — A's branch has all three, and B is downstream of it

I ran the claim's own `find` **one level up**, at `prototypes/standalone/`. It hits immediately:

```
prototypes/standalone/obligations-standalone-spike/i18n/          (index.js, resolve.js, resolve.test.js)
prototypes/standalone/obligations-standalone-spike/model/messages.en.json
prototypes/standalone/obligations-standalone-spike/model/messages.test.js
```

**Provenance — this is side A's, not shared history:**
- `git ls-tree -d 16e391f prototypes/` → **empty**. There was no `prototypes/` directory at the
  divergence point at all. So the spike is post-divergence.
- Added on A's branch in `5081733` — *"feat(EUDPA-249): add obligations-standalone-spike
  journey-model prototype"*, 2 Jul 2026; i18n folder present by `161898f`, 3 Jul 2026 — i.e. **before**
  live-animals was built, by the same author.
- `git ls-tree -d d59b432 prototypes/` → `journey-config-spikes`, `model-spikes` only. **Not on B's branch.**

**It contains all three things C1 says side A does not have:**

1. **A resolver** — `obligations-standalone-spike/i18n/resolve.js` (41 LOC). `createResolver(messages)`,
   `resolveMessage`, `resolveReason({code, values})`; catalogue `readFileSync`-ed once at module scope —
   architecturally the same shape as B's `lib/i18n.js`. Header comment `:5-11`:
   > *"Dotted, locale-agnostic codes (authored by `engine/reasons.js` and `validation/`) plus
   > interpolation values resolve to English copy from `model/messages.en.json`. Unknown codes and
   > unresolved `{placeholder}` tokens **THROW**, so a raw code can never reach the DOM."*

   `:20` — *"Build a resolver over any message catalogue (fixtures, **future Welsh**)."*
2. **A locale catalogue** — `model/messages.en.json`, dotted locale-agnostic keys
   (`mandate.email.missing`, `format.postcode.invalid`, `rule.dateOfBirth.minAge`, `scope.answered`).
3. **A build-time catalogue gate** — `model/messages.test.js` (112 LOC), enforcing things
   **B's gate does not have**:
   - dotted-key discipline (`:25-32`);
   - **orphan-key anchoring** — every `mandate|format|rule` code must name a real obligation
     (`:34-43`). **B has no orphan check at all** (L2 §1 lists this as a B weakness);
   - well-formed `{camelCase}` token check (`:84-94`);
   - **no-leaked-codes** — no message may embed a raw reason code (`:107-111`).

**And it is wired, not shelved:** `validation/field-errors.js:1,16`
(`toFieldErrors(findings, resolve = resolveMessage)`), `contract/view.js:3,24` (`resolveReasons`),
`contract/submit.js:2,48,51` (`text: resolveReason(mandate)`). The engine states the rule outright —
`engine/reasons.js:4`: *"the code doubles as the i18n key"*. That is **precisely** the
"zero English in the model layer" property L2 credits to B alone.

**B is downstream of it.** `EUDPA-249-flow-layer/shared/layout.njk:1-2`:

> `{# Adapted from prototypes/standalone/obligations-standalone-spike/templates/layout.njk`
> `   on branch spike/EUDPA-249-prototype-layouts. #}`

`shared/page.njk:1` says the same. The zero-copy-template invariant C1 uses as B's showcase was
adapted from **side A's spike templates**.

---

## 3. What this overturns, and what it does not

**Not overturned — the scoped comparison stands.** Inside live-animals, A has no locale file, no
resolver, no copy gate, no `htmlLang`, and ~119+ inline literals across 32 templates (plus ~315 more
in controllers, per L1-A). B has all three and zero template literals. And B's i18n is far more
complete *for the real journey*: 362 keys covering the live-animals flow vs the spike's ~30 keys
covering a car-insurance toy domain; declaration-site walks over flow/presentation/domain vs a
catalogue-shape check. **On the delivered artefact, B wins this dimension.** That verdict is safe.

**Overturned — "literally zero", and every inference built on it.** Side A's author **built** the
model-emits-codes + catalogue + throwing-resolver + orphan-gated-catalogue design **first**, in the
direct ancestor of live-animals' engine, then **dropped it** when scaling to the real journey. That
is a *regression under delivery pressure*, not a *structural incapacity* — the exact "not built vs
cannot be built" confusion the method warns about, and it is load-bearing for three L2 conclusions:

- L2 §1: *"both sides independently reached 'no copy in the model' — A by **deleting** copy, B by
  **keying** it. B's version keeps the seam; A's version **destroys** it."* → A's branch keyed it
  first. A did not fail to reach the design; A reached it and then abandoned it.
- L1-A §5 / L2 §5: *"side A contributes **nothing** to a third-option content model except a
  cautionary tale."* → **False.** A contributes a working resolver, a code-emitting engine seam, and
  two gate checks B lacks.
- Retrofit sizing: restoring codes-in-the-engine + a resolver in live-animals is **restoration with a
  working in-repo precedent by the same author**, not invention. The mechanical bulk (~434 literals,
  ~711 test pins) is unchanged and remains the true cost — but the *design* risk drops to near zero.

**A-side asset the shopping list is currently missing.** A's spike resolver's miss policy is
**stricter** than B's shipped one: it **throws** on an unknown code *and* on an unresolved
`{placeholder}` (`resolve.js:22-33`) — *"a raw code can never reach the DOM"*. B's `t()` **renders the
dotted path** on a miss (`i18n.js:47-53`) and `interpolate()` leaves `{name}` in the output
(`:69-75`). Which is right for production is a genuine trade (B's is more resilient; A's is more
honest, and for a Welsh-language-duty service a leaked `flow.section.origin.title` in the DOM is a
compliance failure, not a "visible signal to the reviewer"). What is *not* a trade: B's soft policy is
only safe because the gate is complete, and B's gate has **18 used-but-ungated keys**. A's orphan
check and no-leaked-codes check are ~15 LOC each and close two of B's four documented gate holes.

**Silence worth noting.** live-animals' own `docs/*.md` never mentions the precursor spike
(`grep -rn "obligations-standalone-spike\|standalone-spike\|spike-a" <live-animals> --include="*.md"`
→ **no hits**). `docs/decisions.md` #6 documents dropping `type`/`options`/copy from the *obligation*,
but nothing anywhere records the decision to drop the *resolver and catalogue*. The drop looks
unconsidered rather than decided.

---

## 4. Amended claim

> **Under `prototypes/standalone/live-animals`, A has no i18n infrastructure** — no locale catalogue,
> no resolver, no coverage gate, no `htmlLang`, and no engine-emitted message codes (`engine/` has no
> `reasons.js`). Copy is inline English: ~119+ user-facing literals across 32 `.njk` (a narrow
> macro-arg-only grep returns 113 before counting bare text nodes), plus ~315 more in controllers and
> `shared/kit.js`. **B has all three, verified exactly as cited**: `lib/i18n.js` (82 LOC —
> `t`/`tOrNull`/`interpolate`/`hasKey`), `locales/en.json` (**362** leaf keys, counted), and
> `i18n-coverage.test.js` (221 LOC) which hard-fails on a missing key at every automatic declaration
> site (flow `titleKey` + `errors.required`, `OBLIGATION_KEYS`/`PAGE_KEYS`, domain `labels`, address
> sub-fields, `FORMAT_ERROR_KEYS`, `CHROME_KEYS`), each walk guarded by a "collects ≥1 key" regression
> check. B's 8 `.njk` (299 LOC) contain zero user-facing literals; `shared/page.njk:5` states the
> invariant and the code honours it. **On the delivered journey artefact, B is decisively ahead.**
>
> **But this is a gap in what A shipped, not in what A's model can express — and not even in what A's
> author has already built.** The same branch carries `prototypes/standalone/obligations-standalone-spike`
> (added `5081733`, 2 Jul 2026; absent from the merge base `16e391f` and from B's branch), which
> contains a wired resolver (`i18n/resolve.js`, 41 LOC — throws on unknown code *and* on unresolved
> placeholder), a dotted locale-agnostic catalogue (`model/messages.en.json`), an engine that emits
> codes not English (`engine/reasons.js:4` — *"the code doubles as the i18n key"*), and a catalogue
> gate (`model/messages.test.js`, 112 LOC) with an **orphan-key check and a no-leaked-codes check that
> B's gate does not have**. It is consumed by `validation/field-errors.js`, `contract/view.js` and
> `contract/submit.js`. B's own `shared/layout.njk:1-2` and `shared/page.njk:1` record that B's
> zero-copy templates were **adapted from that spike**.
>
> So the honest framing is: **A built the keyed-copy design first, in the direct ancestor of its own
> engine, and dropped it when scaling to the real journey — with no decision recorded anywhere in its
> docs.** B carried the same idea forward and completed it at journey scale. The third option should
> take B's declaration-site catalogue and coverage walks **and** A's spike's throwing miss-policy,
> orphan-key check and no-leaked-codes check — the last three are ~15 LOC each and close holes B has.
>
> Neither side sets `htmlLang`; neither side has Welsh.

---

## 5. Searches run (for the record)

```
find <live-animals> -iname "*locale*" -o -iname "*i18n*" -o -iname "en.json"
     -o -iname "*message*" -o -iname "*copy*" -o -iname "*content*" -o -iname "*reason*"
     -o -iname "*label*" -o -iname "*text*"                                   → no i18n artefact
find <prototypes/>  (same predicates)                                          → the 3 spike hits  ← the finding
grep -rn "resolveMessage|resolveReason|createResolver|i18n" <spike>            → 8 wiring sites (validation/, contract/, engine/)
ls <live-animals>/engine                                                       → no reasons.js
git ls-tree -d 16e391f prototypes/                                             → empty (spike is post-divergence)
git ls-tree -d d59b432 prototypes/                                             → journey-config-spikes, model-spikes (spike absent from B)
git log -1 -- <spike>/i18n                                                     → 161898f, 3 Jul 2026; dir added 5081733, 2 Jul 2026
grep -rn "obligations-standalone-spike|standalone-spike|spike-a" <live-animals> --include="*.md"  → 0 hits
wc -l <B>/lib/i18n.js <B>/locales/en.json <B>/i18n-coverage.test.js            → 82 / 584 / 221
grep -cE '^\s*"[^"]+"\s*:\s*"' <B>/locales/en.json                             → 362
find <B> -name "*.njk"                                                         → 8 files, 299 LOC
grep -rn "text:|html:|>[A-Z][a-z]" <all 8 B .njk>                              → all view-model bound; only literal is text: ''
find <live-animals> -name "*.njk"                                              → 32 files, 1,499 LOC
grep -rhoE "(text|html|label|legend|caption|hint):\s*\"[A-Z][^\"]{3,}\"" <live-animals> --include="*.njk"  → 113
```
