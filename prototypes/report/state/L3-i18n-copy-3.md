# L3 — Adversarial verification — i18n-copy — claim C3

**VERDICT: AMENDED.** The conclusion (B's value/copy layer is the better model, A's
address block is genuinely re-typed) survives. The *mechanism* the claim asserts does
not: two of its four load-bearing assertions are false on the source, and one of them
is false in a way that flips the direction of the comparison on one arm.

Verified independently against both clones (read-only), not taken from L1/L2.

---

## Decomposition

| # | Assertion | Result |
|---|---|---|
| C3.1 | B has one declaration site where codes + display copy meet — `staticEnum(options, { labels })` | **TRUE** |
| C3.2 | …and the widget, validation, CYA label **and the obligation's conditionality predicate** all derive from it | **FALSE for the predicate**, and structurally so — B's obligation *cannot* read the domain |
| C3.3 | A's obligation model has **no slot** a value domain or label map could ever live in, **enforced at boot** | **FALSE on both halves.** The boot guard whitelists exactly such a module, and A's obligations already import one |
| C3.4 | Four consumers re-declare each field with no cross-check; the V4 address block, declared once in the spec, is re-typed ~75× | **TRUE for the address block** (and for un-serviced fields). **FALSE as a blanket statement** — serviced fields have a single declaration site |

---

## 1. C3.1 — verified

`clone-flow-layer/prototypes/journey-config-spikes/EUDPA-249-flow-layer/domain/index.js:134-142`:

```js
export function staticEnum(options, { labels } = {}) {
  const entry = { type: 'enum', options: () => options }
  entry.labels = labels ?? {}
  entry.metadata = { shape: 'staticEnum', options, labels: entry.labels }
  return entry
}
```

`:334-352` — `REASON_FOR_IMPORT_OPTIONS` (codes) + `reasonForImportDomain = staticEnum(…, { labels })`
mapping each **code** to a **message key** (`'internal-market' → 'domain.reasonForImport.internal-market'`).
Real, and it means what the claim says.

## 2. C3.2 — REFUTED. B's predicate does not derive from the declaration, and cannot.

- `obligations/obligations.js` has **one** import: lines 43-48, `from './helpers.js'`. It never
  imports `domain/`.
- The dependency runs the **other way**: `domain/index.js:27-68` imports 40 obligations
  from `../obligations/obligations.js`, and `domain/index.js:1150-1194` is
  `export const domain = new Map([[reasonForImport.id, reasonForImportDomain], …])` —
  a **sidecar registry keyed by obligation id**. So an obligation reading its own domain
  would be a module cycle. The claim's "the obligation's conditionality predicate derives
  from that one declaration" is not merely unbuilt in B — it is precluded by B's own layering.
- B's predicate operands are **hand-typed code arrays inside `obligations.js`**:
  `:332` `const LAND_TRANSPORT_MODES = ['railway','road-vehicle']`;
  `:601-605` `export const PASSPORT_COMMODITIES = ['0101','0102','01061900']`.
- Nothing checks they are members of the domain. `grep -rn "domain" obligations/whitelists.test.js`
  → **zero hits**. The anti-drift guard (`whitelists.test.js:177-238`) pins each whitelist against a
  **hand-typed `EXPECTED` literal** — a second copy of the same re-typed codes, not a membership
  check against `commodityCodeDomain.options()`. `grep -rn "\.options("` across B's whole tree shows
  `options()` invoked only by the engine, the controller sketch and `domain/index.test.js` — never
  by an obligation, never by a whitelist test.

So on the predicate arm, **B re-types codes exactly as A does**. The real difference is what gets
re-typed (B: codes; A: English display strings for several fields), not whether anything is derived.

## 3. C3.3 — REFUTED. A has the slot, uses it, and boot enforces nothing about it.

**(a) The cited path is wrong and the cited mechanism does something else.** There is no
`engine/obligation-purity.js`; the file is at the prototype root
(`clone-live-animals/prototypes/standalone/live-animals/obligation-purity.js`, 47 lines, run from
`routes.js:20`). It is a **regex scan of import specifiers** over `features/*/obligations.js` source
text (`:8` `SPECIFIER_RE`, `:19-46` `assertObligationPurity`). It says nothing whatever about the
*shape* of an obligation object. There is no obligation-key schema anywhere in A —
`grep -rn "Object.keys|allowedKeys|ALLOWED|Unknown key"` over `engine/` + `contract.test.js`
returns only an unrelated `resume-self-heal` assertion and `evaluate/predicate.js:27`. And
`grep -rln "options\|labels"` over the whole of `engine/` returns **nothing** — the engine has no
opinion on those keys at all. **Adding `options` / `labels` to an A obligation would not throw at
boot; it would be silently ignored.** "Their absence is enforced at boot" is false. This is the
not-built / cannot-be-built conflation.

**(b) The guard explicitly *permits* the very module the claim says cannot exist.**
`obligation-purity.js:13-17`:

```js
export const isReferenceServiceImport = (specifier) =>
  /(^|\/)services\/[^/]+\/index\.js$/.test(specifier)
const isPermittedObligationImport = (s) =>
  isSidewaysObligationImport(s) || isReferenceServiceImport(s)
```

A reference-data service **is** a value-domain + label-map module.

**(c) A's obligations already source their predicate operands from it — better than B does.**
`features/commodities/obligations.js:1` imports `../../services/commodities/index.js`, and `:33`, `:39`,
`:45`, `:51`, `:83` read `commodities.passportCommodities()`, `.tattooCommodities()`,
`.earTagCommodities()`, `.horseNameCommodities()`, `.permanentAddressCommodities()` straight into
`activatedBy`. Same for `cph-number/obligations.js:2` and `additional-details/obligations.js:2`.
The whitelists live **once**, in `services/commodities/stub.js:87-99`.
**On this arm A derives and B re-types — the exact inverse of the claim.**

**(d) A already has an off-obligation single declaration site where codes and copy meet, with three
of the four consumers deriving from it.** `services/import-reason-purpose/index.js:1-20` wraps
`PURPOSE_IN_INTERNAL_MARKET_LABEL` — a code→label map, structurally the same object as B's `labels`
— and exposes `purposes()` / `purposeLabel(code)`. Derived from it:
- **widget** — `features/import-purpose/controller.js:51` `purposeOptions: importReasonPurpose.purposes().map(…)`
- **validation** — `:35-40` `oneOf('purposeInInternalMarket', importReasonPurpose.purposes().map(o => o.value))`
- **CYA** — `features/check-answers/controller.js:16` imports the same service for its label lookups
- **predicate** — `features/import-purpose/obligations.js` gates on `'internalMarket'`, a hand-typed code
  (precisely as B hand-types `LAND_TRANSPORT_MODES`)

**(e) The claim credits a doc the code does not honour.** `docs/obligation-model.md:62-66` says the
guard "rejects any import specifier that is not another `obligations.js`" — omitting the services
whitelist that `obligation-purity.js:13-17` actually permits. The claim inherits that doc's stricter
story. `docs/decisions.md:272-283` and `obligation-model.md:36-42` *are* quoted accurately (type /
options / copy / widget / validation were removed from the obligation, on a usage trace) — but they
are a statement of what was **deleted**, not of what is **forbidden**.

## 4. C3.4 — verified for the address block; overstated as a general rule

The address block is genuinely the worst case and the claim is right about it.

- Declared **once** in A's spec: `spec/journey-spec.json:181-195` — `fieldGroups.address`, 9 fields,
  with per-field max-lengths and mandatory/optional in the `detail` string. The spec is imported
  **zero** times at runtime (`grep -rn "journey-spec"` over the prototype → one hit, in `PROVENANCE.md`).
- Re-typed across **2 templates + 3 controllers** (not "3 templates and 3 controllers"):
  `features/addresses/create-address.njk` (7 label-literal lines) and
  `features/transport/private-transporter-details.njk` (7);
  `features/addresses/create-address.controller.js` (7 message lines + field-name array `:27` + value
  map `:137`), `features/transport/private-transporter-details.controller.js` (7 + `:25` + `:101` + `:135`),
  `features/commodities/animal-identification.controller.js` (14 — this one builds the inputs in JS,
  `:272 addressFieldsFor`, `:288 input('addressLine2', 'Address line 2 (optional)', …)`).
  Plus per-field reads in `check-answers/controller.js:64`, `contact/controller.js:23`,
  `transport/transporters-select.controller.js:23`, `addresses/party-picker.controller.js:13`.
  ~42 label/message literal lines; ~75 total sites once field-name arrays and value-mapping objects
  are counted. **No shared address macro or field list exists** — `grep -rn "ADDRESS_FIELDS|addressFields"`
  finds only a private helper inside `animal-identification.controller.js`, and `shared/` holds no
  address partial.
- B's contrast is real: `domain/index.js:197` `export function addressBlock(…)` — declared once,
  instantiated **9×** at `:906-960` (commercialTransporter, privateTransporter, placeOfOrigin,
  consignor, consignee, importer, placeOfDestination, contactAddress, permanentAddress).

But "four consumers re-declare each field independently and nothing checks they agree" is **not true
of A's serviced fields** (commodities, species, import reason/purpose, certification purposes,
countries, ports, transport reference, document types). It is true of the un-serviced ones — the
address block, transport free-text, contact details.

---

## What B actually has that A structurally lacks (the true asymmetry)

1. **An obligation→domain binding registry.** `domain/index.js:1150-1194` — a `Map` keyed by
   `obligation.id`. A's `registry.js:77-81` is `all` / `byId` / `byPath` only: purely structural,
   no value/copy binding.
2. **A completeness gate over that binding.** `obligations/coverage.test.js:80-106` hard-fails if an
   obligation has neither a `domain` entry nor a reasoned `KNOWN_UNWIRED` entry, plus reverse-drift
   and orphan checks. A has **no** equivalent: its service seam is opt-in per consumer, so nothing
   requires a field to have a value domain or checks that its consumers used the same one.
3. **Labels as message keys rather than as the stored value.** A's `services/commodities/stub.js:1`
   `COMMODITY_OPTIONS = ['Cow','Horse','Cat','Dog','Fish']` — the English name **is** the code (`:87`
   `PASSPORT_COMMODITIES = ['Horse','Cow','Cat','Dog']`), with `COMMODITY_CODES` (`:3-10`) as a
   side lookup. That, not the absence of a slot, is A's i18n-fatal fact.
4. **A composite reuse factory** (`addressBlock`).

## What I searched

- B: `grep -n "from '" obligations/obligations.js` → only `./helpers.js`.
- B: `grep -rn "PASSPORT_COMMODITIES|LAND_TRANSPORT_MODES"` (whole tree) — declared and consumed
  entirely inside `obligations.js` + `whitelists.test.js`.
- B: `grep -rn "domain" obligations/whitelists.test.js` → zero hits. Read `whitelists.test.js:100-239`.
- B: `grep -rn "\.options("` (whole tree) — no obligation or whitelist test calls it.
- B: read `domain/index.js:20-68` (imports), `:100-180` (factories), `:330-370`, `:1140-1195` (registry);
  `obligations/coverage.test.js:60-120`; `grep -rn "addressBlock("`.
- A: `find … -name "obligation-purity*"` → prototype root, not `engine/`. Read in full.
- A: `grep -rn "assertObligationPurity"` → `routes.js:20` (boot).
- A: `grep -rln "options|labels"` over `engine/` → nothing.
- A: `grep -rn "Object.keys|allowedKeys|ALLOWED|Unknown key"` over `engine/` + `contract.test.js` → no
  obligation-shape schema.
- A: `grep -rn "^import" features --include=obligations.js` → 3 obligations.js import a service.
- A: read `features/commodities/obligations.js` in full, `services/commodities/index.js`,
  `services/commodities/stub.js:1-99`, `services/import-reason-purpose/index.js`,
  `features/import-purpose/controller.js:25-56`, `registry.js`.
- A: `grep -rn "Address line 2|addressLine2"` over `features/` (28 hits); per-file counts of the 9
  address label literals; `grep -rn "ADDRESS_FIELDS|addressFields"`; `ls shared/`.
- A: `grep -rn "journey-spec"` → 1 hit, `PROVENANCE.md` (spec is not wired at runtime);
  read `spec/journey-spec.json:180-196`, `docs/decisions.md:262-283`, `docs/obligation-model.md:28-72`.
