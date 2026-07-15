# L3 — Adversarial verification — validation-errors — CLAIM VE-3

**Claim:** Error copy is CODE on A and DATA on B. A has ~54 English literals at
controller call sites plus 2 constant maps, zero i18n, zero derivation — and states
the exclusion as a design axiom. B has 100% i18n-keyed copy (362 keys) and derives
every domain-rule message from the error CODE plus params through a 10-entry dispatch
table, so Welsh costs B a cy.json plus a locale param, and costs A an extraction
project across 15 controllers and 18-32 templates.

**VERDICT: AMENDED.** The central CODE-vs-DATA axis survives and I could not break
it. Five load-bearing details do not survive: B is not 100% keyed, B's derivation has
an uncovered code, B's copy is a hybrid (not pure code-derivation), B's Welsh bill is
materially larger than "a cy.json plus a locale param", and A's Welsh bill is
materially larger than "an extraction project" — in A's disfavour.

---

## 1. What I verified as TRUE

### A has zero i18n — confirmed, not merely "not found"

```
grep -rln --include="*.js" --include="*.njk" --include="*.json" \
  "i18n\|locales\|en\.json\|gettext\|translat"  <A root>
→ ZERO files.
```

No resolver, no catalogue, no key, no locale. Every user-facing error string is an
English literal in a `.js` call site or a `.njk`.

### B's 10-entry code dispatch — confirmed verbatim

`lib/format-domain-errors.js:21-68` — `COPY` is keyed by `error.code`, and I counted
**exactly 10** entries (`enum.notInOptions`, `string.maxLength`, `string.required`,
`integer.min`, `integer.maxDigits`, `date.format`, `array.maxSelections`, and three
`address.subField*`). Each returns `t(key, params)`. `textFor` at `:92-102`.
`locales/en.json:565-581` holds the parameterised templates, e.g.
`"stringMaxLength": "Enter no more than {max} characters (you entered {actual})"`.
The quoted evidence is real and means what the claim says.

### A's axiom quote is real

`docs/obligation-model.md` — *"There is deliberately no `type`, no copy, no widget
choice and no validation on an obligation."* Real. (See §3.6 for what it does and does
not exclude.)

---

## 2. Counter-examples found — where the claim breaks

### 2.1 "B has 100% i18n-keyed copy" is FALSE

`features/check-your-answers/controller.js:139-151` — `keyLabelFor()` builds English
in JS:

```js
return `${presentation.pageTitle} (animal ${ordinalOfUnitId(state, lineId, unitId)}
        on commodity line ${ordinalOfLineId(state, lineId)})`
...
return `${presentation.pageTitle} (commodity line ${lineNumber(lineId)})`
```

…then feeds it straight into `t('cya.promptEnterValue', { label })` (`:154-156`).
`"(animal "`, `" on commodity line "`, `"(commodity line "` are hardcoded English with
no key. This is on the **completeness-failure prompt path** — inside this dimension,
not adjacent to it. A Welsh CYA prompt would carry an English parenthetical
mid-sentence, and B's copy layer has no params/state channel in which to fix it
(`lib/presentation.js` `forObligation()` returns a fixed triple).

### 2.2 "derives EVERY domain-rule message from the code" is FALSE — one code has no copy

`obligations/obligations.js:592` declares `errorCode:
'obligation.unitRecord.identifiersRequired'`, emitted by `engine/index.js:531`. That
code is in **neither** the 10-entry `COPY` table **nor** `en.json`. `textFor` would
fall through to `t('errors.domain.unknownCode', { code })` and render:

> "This value could not be validated (error code: obligation.unitRecord.identifiersRequired)"

And no gate catches it: `i18n-coverage.test.js` walks `FORMAT_ERROR_KEYS`
(`format-domain-errors.js:76-90`), a **hand-maintained array**, so a declared
`errorCode` with no dispatcher entry is invisible to the coverage gate. B's derivation
is not total, and its celebrated gate does not cover the derivation's own input space.

### 2.3 B's error copy is a HYBRID, not pure code-derivation

13 flow entries carry hand-authored **per-field message keys**
(`flow/flow.js:125,151,198,203,221,339,387,394,401,443,452,461,470`, e.g.
`errors: { required: 'errors.regionCode.required' }`). These are resolved to a
**string** inside the validator:

```js
// contract.js:280
message: key ? t(key) : t('errors.defaultRequired')
```

…and short-circuited ahead of the dispatch table:

```js
// format-domain-errors.js:98
if (error.message) return error.message
```

Both halves are data, so CODE-vs-DATA holds. But B's model is "10 code-derived domain
templates **+** 13 hand-authored per-field keys", not "every message derived from the
code". (Side note for the neighbouring claim VE/§2.4: this `message` channel means
B **does** already have a per-field override seam — it is used for `required`, and
extending it to domain codes is a key lookup, not a new mechanism.)

### 2.4 "Welsh costs B a cy.json plus a locale param" — materially understated

Verified at source:

- `t()` / `tOrNull()` / `hasKey()` take **no locale param** (`lib/i18n.js:47,61,80`);
  `en.json` is `readFileSync`-ed **once at module scope** (`:24-27`).
- `lib/presentation.js`, `lib/field-widgets.js` and `lib/chrome.js` have **no
  `request` in scope at all** — grep for `request` in those three files returns only
  comments saying an argument will be added *"when locale threading lands (see NEXT.md
  P0.5)"* (`chrome.js:35-37`). The locale threading exists **only in comments**.
- `contract.js:280` resolves copy **inside `validatePagePayload`** — a request-free,
  synchronous, core-contract function. Locale must therefore be threaded into the
  **validation contract API**, not just a view helper; every caller changes.
- ~100 `t()`/`tOrNull()` call sites across ~15 non-test modules.
- **The killer: B's message format structurally cannot express Welsh.**
  `interpolate()` (`lib/i18n.js:69-75`) is a 7-line `{name}` regex replace with **no
  plural, no gender, no mutation machinery**. B already ships the bug in English —
  `en.json:575` `"Select no more than {max} items"` renders **"Select no more than 1
  items"**. Welsh has *more* plural categories than English, not fewer.

So Welsh costs B: a cy.json **+ a locale param on the validation contract, not just on
`t()` + a message-format engine (ICU / i18next) to replace `interpolate()`**. That is a
real, non-cosmetic addition the claim omits. B's bill is still far smaller than A's —
but "a cy.json plus a locale param" is not the honest size.

### 2.5 A's side is understated — in A's disfavour

- **"2 constant maps" → there are four**, plus four module-level message constants:
  `transport/private-transporter-details.controller.js:12` (`MANDATORY_MESSAGES`),
  `commodities/animal-identification.controller.js:84` (`IDENTIFIER_MAX_MESSAGES`) and
  `:94` (`ADDRESS_MANDATORY_MESSAGES`), `addresses/create-address.controller.js:14`
  (`MANDATORY_MESSAGES`); plus `documents/upload-config.js:37,42` and
  `documents/controller.js:36,38`.
- **"15 controllers" → 16** by grep over validation call sites (and `search.controller.js`
  / `transit-countries.controller.js` hold error copy without using `lib/validate`, so the
  true copy-bearing count is higher still).
- **Citation slips:** `ADDRESS_MANDATORY_MESSAGES` is *defined* at
  `animal-identification.controller.js:94-102` — `:218-225` (as cited) is its
  consumption site. The count-drop file is `features/commodities/consignment-details.controller.js`,
  not `features/consignment-details/controller.js`.
- **The cost the claim misses entirely: on A, English is load-bearing in CONTROL FLOW,
  not just copy.** `features/transport/obligations.js:22` —
  `includes: ['Railway', 'Road Vehicle']`; `:34` — `equals: 'Commercial'`. A's
  obligation predicates gate on **English display strings**, and those same labels are
  the persisted values (pinned byte-exact by the skeleton-equivalence test, per
  L2-i18n). So A's Welsh bill is not "extract copy from controllers and templates" — it
  is extract copy **+ introduce a code/label split in the store + re-pin the wire
  contract**. Translating a label on A today silently breaks the journey's gating.

### 2.6 The "design axiom" framing conflates two exclusions

`docs/obligation-model.md:36-42` excludes copy **from the obligation**. That genuinely
forbids *model-derived* messages (you cannot generate "Enter a passport number" from an
obligation that has no label). It says **nothing** about whether error copy could live
in a locale catalogue — nothing in A's architecture forbids one, and
`obligation-purity.js` guards *imports into `obligations.js`*, not copy generally.
A's own L1 read concedes it: *"No i18n … structural? **NO (false)** but expensive."*

So A's zero-i18n is **not built**, not **cannot be built**. The claim states "zero
i18n" as fact (true) but the phrase *"states the exclusion as a design axiom"* invites
the stronger, false reading that A's model rules i18n out. It does not. This is the
exact conflation the method warns about, and it must not survive into the synthesis.

---

## 3. What I tried and failed to break

- Hunted A's whole tree for any i18n/catalogue/derivation mechanism — **none exists**.
  The CODE half of the claim is solid.
- Hunted A for any code→message dispatch. The nearest thing is
  `documents/upload-config.js:37,42`, where the message is composed from config
  (`` `The selected file must be smaller than ${MAX_FILE_SIZE_LABEL}` ``) — parameterisation
  from a constant, not derivation from an error code. Not a counter-example.
- Hunted B for a non-keyed error message outside CYA — the domain and flow paths are
  genuinely keyed end to end. The DATA half holds.

## 4. The finding worth carrying into the synthesis

A's `IDENTIFIER_MAX_MESSAGES` (`animal-identification.controller.js:84-92`) is a
**per-obligation-id → message map**: "Passport must be 58 characters or fewer",
"Ear tag must be 58 characters or fewer". B's code-derived equivalent renders
"Enter no more than 58 characters (you entered 60)" for *every* field
(`en.json:570`). On this dimension the CODE side has **better GDS copy precisely
because it is per-field**, and the DATA side has worse copy precisely because it is
derived from the code alone. The third option needs both: derivation as the default,
`errors.${obligation}.${code}` as a lookup that wins when present. B's `message`
short-circuit (`format-domain-errors.js:98`) is already the hook for it.
