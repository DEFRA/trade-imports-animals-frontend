# L3 — PM-6 — adversarial verification

**Verdict: AMENDED.**

The *defect* is real, serious, and correctly described. The *diagnosis* is wrong, and the
*arithmetic* is wrong. PM-6 claims the missing mapper gate is "a MODEL consequence... follows
directly from PM-1 — the model carries no field-level type information", and that "B owns the
exact fix". Neither survives contact with A's source. A already owns the registry primitive and
already owns an isomorphic anti-rot pattern; it simply never aimed either at the mapper. That is a
**build omission, not a paradigm defect** — and the claim self-refutes by conceding the fix takes
"an afternoon" with no model change.

---

## 1. What I verified — every cited line is real (the defect stands)

| Cited | Status |
|---|---|
| `docs/add-a-field.md:16` "Adding a field touches five places." | **verbatim.** |
| `add-a-field.md:11` only waves at "the persistence wiring" | **true** — ":8-14" prose: "You author the rendering, the validation, the persistence wiring and the Check your answers row by hand." No step covers it. |
| Mapper absent from the recipe | **stronger than claimed.** `grep -rn "mapper\|Mapper"` over `add-a-field.md`, `add-a-page.md` **and** `add-a-collection.md` → **zero hits in all three**. |
| `contract.test.js` is collects-vs-commits, never commits-vs-maps | **confirmed.** `:43-52` (`committedIds` / `committableCollects`), `:173-181` (the set-equality assertion). Nothing in the file touches persistence beyond booting the stub. |
| Mapper has no registry/coverage test | **confirmed.** `grep -rn "registry\|obligations" services/persistence/records/` returns **three comment lines and nothing else** (`notification-mapper.js:8`, `:320`, `notification-mapper.test.js:14`). The mapper layer does not import the registry anywhere. |
| `notification-mapper.test.js:293-323` pins the lossiness | **confirmed**, and the dropped-key list at `:301-312` is **hand-written**, not derived from `registry.all`. |
| `notification-mapper.test.js:261` `expect('documents' in notification).toBe(false)` | **verbatim.** |
| `mapper.js:14-17` env selection | **verbatim.** |
| B `obligations/coverage.test.js:80-104` three-way gate | **confirmed** — `:81-86` both-missing, `:88-97` no forward rot, `:99-104` no backward rot. |

**So the consequence PM-6 states is TRUE and I could not break it:** a field added exactly by
`add-a-field.md` works in stub mode and is **silently dropped in real + Mapper-A (the default)
mode, with no test going red.** I hunted for any gate that would fire and found none — the
lossiness test hardcodes its key list, `skeleton-equivalence.test.js` compares hand-built
fixtures, `real.integration.test.js` is gated behind `LIVE_ANIMALS_IT=real` (off by default) and
also uses hand-written fixtures, and `buildDispatch`'s boot assert covers page-collects coverage
only. **Defect: CONFIRMED.**

Worse than the claim says, in fact: `add-a-field.md:154-162` ("What you do not touch") ends with
*"No new test file — the contract case covers the commit"* — the recipe actively tells you the
existing tests suffice.

---

## 2. Where it breaks — the defect is NOT a model consequence

### 2.1 A has the exact primitive a coverage gate needs, and already iterates it

`registry.js:77-79` exports `{ all, byId }`. `contract.test.js:44` already does
`registry.all.map(o => o.id)`. A mapper gate — *"every obligation id is either mapped to a backend
path or explicitly allow-listed as not-transmitted"* — needs **the id set and nothing else**. A has
it. Zero model change required.

Field-level **type** information (PM-1) is what you need to **DERIVE** a mapper. It is not what you
need to **GATE** one. PM-6 conflates the two, and that conflation is the load-bearing move in
"this is a defect in the paradigm, not a bug in the code".

### 2.2 A already owns an isomorphic three-way anti-rot pattern — pointed at the wrong target

B's `coverage.test.js` = *registry set, minus an explicit whitelist, must be empty*. A's
`contract.test.js:43-52` is the **same shape**: it enumerates `registry.all`, and
`committableCollects` (`:48-52`) filters with `!obligation.renderOnly && !obligation.system` — a
**model-declared exclusion predicate playing exactly the role of B's `KNOWN_UNWIRED`**, and one
that cannot rot because it is derived from the obligation rather than hand-listed. A also has a
*boot-time* registry coverage gate: `buildDispatch` asserts every non-system obligation is
collected by exactly one page, crashing the server on an unwired def (`add-a-field.md:149-152`).

So "B owns the exact fix but has no mapper to apply it to" is **overstated**. A owns the pattern
twice over. Neither side aimed it at a mapper — B because it has none, A because nobody thought to.

### 2.3 The claim refutes itself

"transplants into A as a mapper gate in an afternoon." A structural/paradigm defect is precisely
one you *cannot* fix in an afternoon without changing the model. An afternoon's test-only work,
with the model untouched, is the definition of a **build gap**. This is the classic
"not-built vs cannot-be-built" conflation the method warns about — and it is the exact inversion of
the L2 doc's own §4.1, which correctly files the same coverage gate under *"none of it is
structural"*.

---

## 3. Where it breaks — the "9 places / 4 mapper edit sites" arithmetic is wrong

PM-6: "4 mapper edit sites (Mapper A forward/reverse, Mapper B forward/reverse)". This assumes the
two mappers are **parallel duplicates**. They are not — **Mapper B composes Mapper A**:

- `notification-mapper.js:431` — `answersToTargetNotification` opens with
  `const notification = answersToNotification(answers)` then layers extras.
- `notification-mapper.js:470` — `targetNotificationToAnswers` opens with
  `const answers = notificationToAnswers(notification)`.

Header at `:320` says it outright: *"Mapper B — Mapper A plus the extra fields"*. So a new field is
**2 edit sites, in exactly one mapper**, never 4:

- **Legacy backend already has a home for it** → edit Mapper A forward + reverse. **Mapper B
  inherits it for free** via the delegation. 2 sites.
- **No legacy home** (the case for any genuinely new field) → edit Mapper B forward + reverse
  **only**. Mapper A must be left alone: its entire contract is byte-equality with the production
  skeleton client (`skeleton-equivalence.test.js:227`,
  `expect(mapperAPayload).toEqual(skeletonPayload)` — `toEqual` is strict on extra keys). Emitting a
  key the skeleton does not emit is a **parity violation**, which is what the lossiness test at
  `:293-323` exists to pin. 2 sites.

Real cost is therefore **8, not 9**: 5 documented + 2 mapper sites + 1 backend schema change. The
inflation to 9 comes from double-counting a mapper that inherits.

---

## 4. What I could not break

- The silent-drop consequence (§1). Searched every gate; none fires.
- The mapper's total ignorance of the registry (grep: zero imports).
- B's coverage gate being the right *pattern* to steal. It is. It is just not B's alone, and it is
  not a model property on either side.

---

## 5. Amended claim

Stated in the structured output. In one line: **the defect is confirmed and is A's worst on this
dimension, but it is a build/discipline omission that A's own existing registry + anti-rot pattern
could close today with no model change — it does not follow from PM-1, and the mapper cost is 2
sites, not 4.**

## 6. Consequence for option three

This *strengthens* the shopping list rather than weakening it, but relocates the item. The
mapper-coverage gate stays on the "take" list — but it moves out of *"reasons B's model is better"*
and into *"cheap discipline both sides forgot"*. It costs nothing to adopt and it is **not**
evidence for B's model. The genuine model-level prize (a **derived** mapper — declare the backend
path once on the obligation, generate both directions) is unclaimed by both sides, exactly as L2 §2
says, and *that* is the item PM-1 actually licenses.
