# L3 — adversarial verification — presentation-widgets — PW-3 (i18n / copy layer)

**VERDICT: AMENDED.** Directionally right — decisively so — but the headline is false at
branch scope, the credit given to B's gate is borrowed from a doc the code does not
honour, and the "Welsh is statutory" framing implies a B-readiness that does not exist.

---

## 1. What survives contact with the source

All of the claim's *scoped* factual assertions are TRUE. Verified:

- **A (live-animals) has zero i18n.** `find … -iname "*locale*" -o -iname "*i18n*" -o
  -iname "en.json"` under `prototypes/standalone/live-animals` → **nothing**.
  `grep -rlniE "i18n|locales|translate|cymraeg|welsh|htmlLang"` over the whole
  live-animals root → **one** file, `services/address-book/stub.js` (a stub street name,
  "7 Welsh Road"). Not a mechanism.
- **Copy is controller-authored.** `features/hub/controller.js:21-118` — `GROUPS` const,
  six group captions + row `{title, hint}` pairs, all English literals (verified at
  :21-39: `caption: '1. About the consignment'`, `title: 'Where is this consignment
  coming from?'`, `hint: 'Country of origin, region of origin code, …'`).
  `features/check-answers/controller.js` hand-builds its rows the same way.
- **B's mechanisms are all real and cited correctly.** `lib/presentation.js:69` —
  `OBLIGATION_KEYS = new Map([...])` mapping obligation id → `{pageTitleKey, legendKey,
  hintKey?}`, running to :399. `forObligation()` at :419-433 exactly as quoted.
  `humaniseId` at :401-408. `locales/en.json` exists. `lib/i18n.js:47-53` `t()` returns
  the key itself on a miss; `:61-67` `tOrNull()` returns `null` — the split and its two
  miss behaviours are real, and the docstring at :55-60 gives the exact rationale the
  claim reports.

So this is **not REFUTED**. B's copy layer is a genuine model win and A's live-animals has
nothing. Three corrections follow.

---

## 2. Counter-example found — A's own branch contains a working i18n layer

The claim's opening — *"A has no copy/i18n layer whatsoever"* — is **false at branch
scope**. Its own evidence line quietly scopes to "under `prototypes/standalone/
live-animals`", and that narrower statement is true. But one directory up, on the same
branch, same author, same `prototypes/standalone/` tree:

```
prototypes/standalone/obligations-standalone-spike/i18n/index.js
prototypes/standalone/obligations-standalone-spike/i18n/resolve.js
prototypes/standalone/obligations-standalone-spike/i18n/resolve.test.js
prototypes/standalone/obligations-standalone-spike/model/messages.en.json   (32 keys)
```

`i18n/resolve.js` is a complete keyed-catalogue resolver:

```js
/** Build a resolver over any message catalogue (fixtures, future Welsh). */
export const createResolver = (messages) => {
  return (code, values = {}) => {
    const template = messages[code]
    if (template === undefined) throw new Error(`Unknown message code "${code}"`)
    return template.replace(TOKEN, (match, token) => {
      const value = values[token]
      if (value === undefined || value === null)
        throw new Error(`Unresolved placeholder "{${token}}" in "${code}"`)
      return String(value)
    })
  }
}
```

`model/messages.en.json:2` states the contract: *"English message catalogue keyed by
dotted, locale-agnostic reason codes (codes double as i18n keys — **Welsh would be a
drop-in sibling file**). This key list IS the reason-code contract: `engine/reasons.js`
registers exactly these codes and `i18n/resolve.js` throws on any code not present here,
so a raw code can never reach the DOM."*

Three things follow, and they matter:

1. **This is "not built", not "cannot be built."** The single most damaging failure mode
   in this exercise is exactly what the claim's framing invites: reading A's absence as a
   structural incapacity. It is not. The same author, in the same obligations-model
   family, already built the keyed-catalogue design and then **dropped it** going into
   live-animals (`docs/decisions.md` #6 removes copy from the model; the catalogue went
   with it). A's retrofit starts from a working design already in its own tree, not from
   a blank page.
2. **A's miss policy is stricter than B's, not weaker.** B's `t()` renders the raw dotted
   path into the DOM (`i18n.js:49-50`) — a *visible* failure. A's spike **throws** on an
   unknown code *and* on an unresolved `{placeholder}` — a *build-time* failure. "A raw
   code can never reach the DOM" is a stronger guarantee than "a raw code reaches the DOM
   looking obviously wrong."
3. **A's spike honours the "code doubles as message key" contract that B's doc claims and
   B's code does not.** (See §3 and L2-i18n-copy on `format-domain-errors.js`'s
   hand-maintained 12-entry table.)

Honest caveat, stated plainly: live-animals imports **nothing** from this spike (`grep -rn
"obligations-standalone-spike\|i18n"` over live-animals → zero hits), the spike is a
different domain (car insurance — `claims/`, `quote/`, `endings/`), and its 32 keys cover
reason/validation codes only, not page copy. It does not reduce the *volume* of A's
retrofit by one string. It reduces the *risk* and the *design* cost, and it refutes any
structural reading.

---

## 3. B's "anti-rot coverage test" is a doc claim the code does not honour

The claim credits B with *"an anti-rot coverage test"* whose evidence line says it
*"asserts every declarative key resolves."* The narrow version is true. The word
"anti-rot" is not.

`i18n-coverage.test.js` is a **hybrid**. It genuinely walks the declarative sites —
`collectFlowKeys()` (:78-87) recurses the flow tree, `collectPresentationKeys()` (:89-101)
walks `OBLIGATION_KEYS` + `PAGE_KEYS`, `collectDomainLabelKeys()` (:103-113) walks
`entry.labels`, `collectAddressSubFieldKeys()` (:115-124). But B's **controller-authored**
copy is gated by hand-typed string arrays, under a comment that admits the rot:

```js
/**
 * Static lists of keys used by the hub / CYA / commodity-lines
 * controllers + their templates. Keep in sync with the `t()` calls in
 * those files. …
 */
const HUB_KEYS = [ … ]              // i18n-coverage.test.js:31-51
const CYA_KEYS = [ … ]              // :53-60
const COMMODITY_LINES_KEYS = [ … ]  // :62-76
```

And it has already rotted. `features/units/controller.js` makes **13 distinct `units.*`
`t()` calls** (:139, :144, :145, :157, :163, :164, :244-249, :261). There is **no
`UNITS_KEYS` array** — `grep -rn "UNITS_KEYS" i18n-coverage.test.js` → **zero hits**. B's
entire units feature's copy is outside the gate. There is also no orphan-key check
(`grep -rn "orphan\|unused"` → zero).

Meanwhile `NEXT.md:1159` asserts the test *"walks every key-carrying source and asserts
each key resolves."* It does not. This is precisely the method-step-4 failure: **the claim
inherits B's own documentation's self-assessment rather than B's code.** B's controller
copy is exposed to the same rot as A's — just across a much smaller surface.

---

## 4. "Welsh is statutory" cuts both ways — B cannot serve a Welsh page either

The claim's closing move implies B has solved the statutory problem and A has not. Neither
has.

- `locales/` contains **`en.json` only** (`find … -iname "cy.json"` → nothing).
- The catalogue is `readFileSync`-ed **once at module scope** (`lib/i18n.js:24-27`), so
  there is one global locale per process.
- **`t(key, params)` has no `locale` parameter** (`:47`). Neither does `tOrNull` (`:61`).
- B's own backlog agrees: `NEXT.md:416-417` — *"**P0.5 — Welsh locale threading.**
  Infrastructure done; needs the request → `t()` locale param plumbing plus `cy.json`."*
  `NEXT.md:1152` — *"IN PROGRESS"*. `:1207-1211` — locale threading ⏳, `cy.json` ⏳.
- B also bakes **English grammar into its fallback**: `humaniseId()`
  (`presentation.js:401-408`) splits camelCase and capitalises the first letter — the path
  taken by any obligation *not* in `OBLIGATION_KEYS` (`forObligation()` :421-427).

So the accurate framing is *cost*, not *capability*: B is a day's threading from Welsh; A
is ~1,145 sites away (L1-A: 428 source strings + **711 tests that pin the exact English** —
95 unit + 616 E2E). That gap is enormous and it is the real finding. But it is a gap
between "nearly there" and "far away", not between "compliant" and "non-compliant".

Note also that the claim **understates** A's retrofit in the other direction: "every
template and several controllers" omits the 711 locale-locked test sites and the persisted
wire contract (`notification-mapper.js:451` passes V4 **display labels** straight through,
pinned byte-exact by `skeleton-equivalence.test.js`) — a constraint B has no answer for
because B has no persistence layer.

---

## 5. What I searched

| Search | Result |
|---|---|
| `find … -iname "*locale*" -o -iname "*i18n*" -o -iname "en.json"` over A's `prototypes/` | **Hit** — `obligations-standalone-spike/i18n/` (§2) |
| `grep -rlniE "i18n\|locales\|translate\|cymraeg\|welsh\|lang=\|htmlLang"` over A's live-animals | 1 hit, `address-book/stub.js` (a stub street name) |
| `grep -rn "obligations-standalone-spike\|i18n"` over A's live-animals | **0** — no import path from A to its own spike |
| Read A `hub/controller.js:18-39`, `messages.en.json`, `i18n/resolve.js`, `i18n/index.js` | Claim's A evidence confirmed; counter-example found |
| Read B `lib/i18n.js` (all 82 LOC), `lib/presentation.js:60-99`, `:395-433` | Claim's B evidence confirmed verbatim |
| `find … -iname "cy.json"` over B | **0** |
| `grep -rn "UNITS_KEYS\|orphan\|unused"` over B's `i18n-coverage.test.js` | **0** — the gate has drifted |
| `grep -rnoE "\bt\('[a-zA-Z0-9._]+'"` over B's `features/units/controller.js` | 13 ungated `units.*` keys |
| `grep -rn "cy.json\|Welsh\|locale"` over B's `NEXT.md` | P0.5 Welsh threading ⏳ IN PROGRESS |

---

## 6. Consequences for the third option

1. **Steal A's throwing resolver, not B's dotted-path fallback.** `createResolver`
   (`obligations-standalone-spike/i18n/resolve.js:21-35`) fails on an unknown code *and*
   an unresolved placeholder. B's `t()` ships the miss to the DOM. A's is the stronger
   guarantee and it is 15 lines.
2. **Replace B's hand-typed `HUB_KEYS`/`CYA_KEYS`/`COMMODITY_LINES_KEYS` with a source
   scan** (`/\bt\(['"]([\w.]+)['"]/` over `features/**` + `lib/**`). This closes the
   13-key units drift and adds the missing orphan check in ~30 LOC. Without it, "anti-rot"
   is aspirational.
3. **Thread locale through `t()` before claiming Welsh.** Both sides are pre-compliant.
4. **Price A's retrofit at ~1,145 sites, not ~430** — the tests are the multiplier.
