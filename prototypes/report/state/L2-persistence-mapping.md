# L2 — Persistence, mapping, upload, amend-after-submit

**Verdict: MIXED** — and the standing prior ("B's model is better, possibly in every respect")
is **refuted on this dimension**. Not because A built more (that is disqualified), but because
on the one question that decides this dimension — *does the model derive the mapper?* — **both
models fail identically**, and where they differ structurally, A is ahead more often than B.

`bOnly` is **empty**. That is the headline finding.

---

## 1. The disqualification, stated up front

A has a working persistence layer, two mappers, a real Java backend, Mongo parity, cdp-uploader
(proxied), freeze-on-submit and amend-and-resubmit. B has `@hapi/yar` and 232 LOC.

**None of that counts.** A build loop was pointed at A. B never claimed this ground
(`RECOMMENDATION.md:178`'s out-of-scope list does not even mention persistence). Scoring A's
breadth here would be scoring the build loop, not the model.

So this document scores **the models**, and asks the only question that matters for option three:
*which model makes a correct persistence/mapping layer cheaper to build and safer to maintain?*

---

## 2. The symmetric finding that decides the dimension

**Neither model carries any backend binding. 0 of 44 obligations, on both sides.**

Side A, `features/documents/obligations.js:1-32` — the *entire* record:

```js
export const accompanyingDocumentType = { id: 'accompanyingDocumentType', required: true }
```

A grep for `backendPath|serialise|serialize|type:|wireFormat|schema` across A's obligation files
returns **nothing**. A's 11-key vocabulary (id, required, requiredAtLeastOne, requiredOneOf,
collection, item, system, renderOnly, activatedBy, wipeOnExit, maxEntriesFrom) has no type and no
path.

Side B, `obligations.js:421-429` — the *entire* record:

```js
export const numberOfPackages = {
  id: '252a3b4c-5d6e-4b82-8f01-5bc2d3e4f507',
  name: 'numberOfPackages',
  within: commodityLine,
  status: 'optional',
  applyTo: allowListed(commodityCode, PACKAGE_COUNT_COMMODITIES, null, [numberOfPackagesReason])
}
```

Shape is exactly `{id, name, within?, status?, applyTo?}`. **No backend binding.**

The prior expected B's obligations model to make mapping easier. It makes the **structure** of
mapping easier and the **naming** of mapping *harder* — and it does **not** make the mapper
derivable. A hand-authored 44-entry table is required on **both** sides. A wrote it (507 LOC,
twice, both directions). B has never written one and has nothing to derive one from either.

The "derive the mapper from the model" prize is **unclaimed by both sides**. That is the single
most important input to option three.

---

## 3. Where A's model is structurally ahead

### 3.1 The durable key is semantic (A) vs opaque (B) — the sharpest structural gap

A persists answers keyed by **human-readable obligation id**: `answers.countryOfOrigin`,
`answers.commodityLines[].animalIdentifiers[]`. A Mongo document is readable, greppable, and a
mapping table can be **audited against the id set**.

B persists `fulfilments[obligation.id] = value` (`state.js:65`) where `id` is a **UUID**
(`obligations.js:422`), and `name` is *by design* the renameable half of the identity pair. So
B's durable document is **meaningless without the code registry** — you cannot read it in Mongo,
cannot write a backend query against it, cannot debug production data without shipping the
obligation table alongside.

This is not an unbuilt feature. It is a **deliberate identity design**, and rename-freedom and
self-describing durable documents are in **direct tension** in B. B cannot have both.

The tell is already in B's own codebase: `dump.js:40-52` exists solely to translate name→id at the
fixture boundary and throws on unknown names. Eleven lines, unidirectional, in a debug tool — the
*shadow* of the mapper B doesn't have. The moment B talks to anything outside the process, it needs
a translation table. A does not.

### 3.2 A file/document value kind — and the purity collision

B's widget vocabulary is `radios | select | checkboxes | date | input` (`field-widgets.js:8`) plus
`address` (`:209`). **No file input. No obligation whose value is a file.**

But the deeper problem is not the widget. B's evaluator is a **pure total function over
user-authored fulfilments**, and the whole recompute-on-load doctrine rests on that purity. A
virus-scan status **mutates externally, between requests, without user input**. It cannot live in
the fulfilments map without breaking the "fulfilments = user answers" invariant that B's design
depends on — and it cannot live outside it without introducing a second state source the evaluator
must merge.

A sidesteps this entirely by keeping upload state *outside* the obligation model
(`services/document-uploads/` + controller-held `uploadId`/`filename`), which is precisely why A
could build it at all.

This is the **single hardest item in either retrofit direction**.

### 3.3 The constraining port surface (model-adjacent, and genuinely clever)

`engine/persistence/records.js` is an 8-method port (`create/load/list/has/saveAnswers/finalise/
amend/clear`) whose unconfigured default **throws** (`:4-6`). Critically it offers **no per-key
write and no delete** — `saveAnswers` replaces the whole answers map.

That constraint is what makes it **physically impossible for a page to hand-roll a wipe**, forcing
scope-exit wipe to stay *derived* (`reconcile` → `destroyWiped`, `write.js:15,58,75`). The cost is
inseparable from the benefit: every page POST in real mode is a full-notification HTTP upsert, no
PATCH, no dirty-field tracking.

This is DI discipline rather than a model, but it is a design property worth carrying forward.

---

## 4. Where B is ahead — and why none of it is *structural*

B has three real advantages here. **All three are portable into A without adopting B's model**,
which is why `bOnly` is empty.

### 4.1 The coverage-whitelist gate — the highest-leverage steal on the dimension

`obligations/coverage.test.js:80-104` is a **three-way anti-rot gate**:

1. no obligation lacks both a domain entry and a whitelist entry (`:81-86`);
2. the whitelist does not rot forward — an obligation later wired must leave the list (`:88-97`);
3. the whitelist does not rot backward — a rename must reach the list (`:99-104`).

This is *exactly* the artefact A is missing (see §5). It is a **test pattern**, not a model
property. It transplants into A in an afternoon.

### 4.2 Declarative nesting + depth-generic instance enumeration

B's `within` chain **is** the backend nesting (`obligations.js:424`), and `evaluator.js:399-420`
already enumerates group instance ids **generically at arbitrary depth** — computing prefix length
from the ancestor-group chain. That is precisely the iteration a mapper needs to build
`commodities[]` and `animals[]`.

A hand-codes the equivalent: `groupLinesByCommodity` (`notification-mapper.js:53-61`) keys on
`line.commoditySelection`, and `speciesEntryFromLine` (`:79-89`) hardcodes
`line.animalIdentifiers?.[0]`.

**But this is not a structural gap in A.** A's model *does* express containment (`collection: true,
item: [...]`, `documents/obligations.js:21-30`) and A has path machinery (`lib/path.js` —
`setAt`/`valueAt`/`destroyWiped`). A *could* walk its own tree; it simply didn't, and hand-wrote
the iteration four times instead. That is a build choice, not a model limit — so it goes here, not
in `bOnly`.

Symmetry worth noting: **both** sides are depth-generic in the core and depth-2-hardcoded at the
edges. B's browser layer branches on `=== unitRecord` by identity (`routes.js:154`) across three
parallel controller factories. Neither side is cleaner here.

### 4.3 Unknown-id tolerate-and-drop (a narrow, real edge)

B's evaluator drops unknown obligation ids (`evaluator.js:24,61`) and purges out-of-scope values
(`:253-268`), persisting the amended set. A stored document self-heals against a *deleted*
obligation.

A's equivalent purges out-of-scope values on write (`destroyWiped`) but leaves **unknown** ids
inert — they are never in scope, so they are invisible, but they accumulate as cruft.

B's edge here is real but **narrow**, and it cuts both ways: B admits it never logs a drop
(`obligations.md:675-676` — silent data loss), whereas A's inertness is arguably *safer* against a
durable store.

---

## 5. The recompute-on-load correction — B's "strongest asset" is convergent, not unique

L1-B calls tolerate-and-amend / recompute-on-load B's **strongest asset** and claims "most
hand-rolled persistence layers need an explicit migration script for exactly this; Side B gets it
free."

**A has the identical property, pinned by test.** `engine/resume-self-heal.test.js`:

- `:38-45` pins the record to *exactly* `{answers, createdAt, journeyId, status, submittedAt,
  userId}` — **nothing derived is persisted**.
- `:28` pins scope re-derivation on re-entry: `regionOfOriginCode` is still in stored answers but
  `scope.has('regionOfOriginCode')` is `false` once it leaves scope.

Both models independently arrived at *persist answers only, recompute everything else on load*.
That is not an asymmetry — it is **convergent evidence that the doctrine is correct**, and it
should be non-negotiable in option three.

---

## 6. A's worst defect on this dimension — and it is a model consequence

**A's mapper has no coverage test, and the recipe doesn't mention it.**

`grep -rln "notification-mapper|toNotification|answersToNotification"` across A's prototype returns
8 files: `DESIGN-DELTA.md`, `docs/persistence.md`, `mapper.js`, `real.js`,
`skeleton-equivalence.test.js`, `notification-mapper.js`, `notification-mapper.test.js`,
`real.integration.test.js`, `flow/opening-run.test.js`.

**Not one of them is an obligations-registry or contract test.** `contract.test.js` checks
*collects-vs-commits*, never *commits-vs-maps*. And `docs/add-a-field.md:16` says "Adding a field
touches **five places**" — the mapper is not one of them; line 11 only waves at "the persistence
wiring".

**Consequence:** a field added exactly by the book works perfectly in stub mode and is **silently
dropped in real mode**. No test goes red.

Real cost of adding one persisted field to A: **9 places**, not 5 — the 5 documented, plus 4 mapper
edit sites (Mapper A forward, A reverse, B forward, B reverse), plus a backend schema change. And
this is a **direct consequence of the model carrying no field-level type information** — it is a
defect in the paradigm, not a bug in the code.

B's `coverage.test.js` gate is the exact fix, and B does not have a mapper to apply it to. That is
the shopping list in one sentence.

*(Secondary: Mapper A — the **default** — is provably lossy, pinned deliberately at
`notification-mapper.test.js:293-323`, dropping 10 top-level keys including the entire `documents`
collection (`:261`). This is fidelity to a legacy backend schema, not a model failing; Mapper B
already demonstrates the fix and needs only backend fields.)*

---

## 7. The most valuable transferable artefact on this dimension

`skeleton-equivalence.test.js:203-227` is an **executable oracle, not a fixture**. It imports the
*actual production* `notification-client` from `src/server`, drives its real `save()`, stubs
`fetch` to capture the exact JSON body the skeleton would POST, and asserts
`expect(mapperAPayload).toEqual(skeletonPayload)`.

Paired with `prototypes/e2e/skeleton-vs-prototype-mongo.spec.js` (drives both journeys against the
same real backend, diffs the two Mongo documents, runs as its own Playwright project so a parity
break cannot hide behind a green demo run).

**Both are model-agnostic.** They would work unchanged against B's mapper the day one exists. In
option three they are the *acceptance test*, whichever model wins.

*(Caveat the spec states itself, lines 14-15: the browser parity compare is on **DRAFT** documents,
not submitted.)*

---

## 8. Verdict

**MIXED**, decomposing as:

| | A | B |
|---|---|---|
| Derives the mapper from the model | **no** | **no** |
| Backend binding on obligations | 0/44 | 0/44 |
| Durable key is self-describing | **yes** (semantic id) | no (UUID) |
| File/document value kind | yes (outside the model) | **no** (+ purity collision) |
| Lifecycle envelope | yes | sketched only |
| Recompute-on-load / self-heal | yes | yes *(convergent)* |
| Declarative nesting + generic enumeration | expressible, hand-coded | **built, depth-N** |
| Mapper coverage gate | **absent** | pattern exists (no mapper) |
| Proven against a real backend | yes | never |

- **A wins on structural expressiveness**: semantic durable keys, a file value kind, a lifecycle
  envelope. Two of these (§3.1, §3.2) are genuine structural gaps in B.
- **B wins on discipline**: the coverage-whitelist gate is the best single idea on this dimension,
  and A's absence of it is A's worst defect.
- **Neither wins the actual prize.** Both require a hand-authored mapping table.

A's build advantage is disqualified — but its **artefacts** (the two parity harnesses) are
model-agnostic and are the most valuable thing either side produced here.

**Prior refuted.** B's model is *not* better in every respect on this dimension. It is better in
one respect (mapping structure), worse in two (durable-key semantics, file value kind), and
identical in one that L1-B claimed as its own (recompute-on-load).

---

## 9. Shopping list for option three

**Take from B:** the three-way coverage-whitelist gate, retargeted at the mapper — *"every
obligation is either mapped to a backend path or explicitly allow-listed as not-transmitted"*. This
single test converts the 44-entry table from a rot risk into a gated artefact and closes A's worst
defect. Also: active unknown-id drop (with logging — B admits it has none).

**Take from A:** the two parity harnesses (the executable skeleton oracle above all); the
whole-answers-only port surface with throwing defaults; semantic obligation ids as the durable key;
null-strip-before-mapping; the session-known-journeys authorisation seam.

**Take from neither:** the mapper design. 507 LOC of bidirectional hand-mapping selected by an env
var is a liability. The correct third option declares the backend path **once, on the obligation**,
generates both directions, and points A's parity harnesses at it as the acceptance test.

**Keep from both (convergent, therefore non-negotiable):** persist answers only; recompute all
derived state on load.
