# L3 — code-shape — Claim C1 — ADVERSARIAL VERIFICATION

**CLAIM:** "B's model layer has zero framework coupling; A's engine cannot be used without a hapi request object. This is the dimension's named axis and B wins it outright."

**VERDICT: REFUTED.** The citations are real; all three assertions fail.

---

## 1. What I verified of the cited evidence (all true, one undercounted)

| Cite | Status |
|---|---|
| `engine/write.js` — `(request, h)` on commit :11, appendEntryAt :20, updateEntryAt :30, removeEntryAt :48, reconcileEntriesAt :62, appendEntry :80, updateEntry :83, removeEntry :86, submitJourney :89 | **TRUE, and undercounted.** The facade (`engine/index.js`) exports **13**, of which **10** take `(request, h)` (9 in write.js + `get` at `read.js:43`). 3 are pure: `makeScope`, `collectionView`, `collectionCapAt` |
| `engine/journey.js:1` imports `BASE` from `config.js` | **TRUE**, and worse than stated: `journey.js:23-33` exports `registerJourneyCookie(server)` calling `server.state(...)` — a hapi **server** API inside `engine/` |
| 5 module-level mutable globals (`dispatch.js:3-6`, `records.js:8`, `session.js:11`, `read.js:7`) | **TRUE but mischaracterised** — see §4 |
| `registry` is a module singleton, ~9 production import sites, no `createEngine(model)` | **TRUE** (grep confirms 10 incl. `analysis/reachability.js:4`) |
| B: `grep -rln "@hapi"` returns only tests + a comment in `lib/state.js:2` | **TRUE as a grep result. Substantively misleading — see §3** |
| B: `createObligationEvaluator({obligations})` at `evaluator.js:44-46` | **TRUE.** Genuine factory injection. A has no equivalent |

---

## 2. Counter-example that kills "A's engine cannot be used without a hapi request object"

**One grep decides it.** Across the whole of `engine/` (read, write, journey, status, store, persistence/, evaluate/), `request` is dereferenced in **exactly one place**:

```
grep -rn "request\." .../live-animals/engine
engine/journey.js:41:    request.app[JOURNEY_MEMO] = journey     # guarded by `if (request?.app)` at :39
```

Everywhere else `request` and `h` are **opaque tokens forwarded to an injected session port** (`engine/persistence/session.js:22` `configureSession(newImpl)`). The engine never reads a hapi API off them. The hapi-touching code lives in the **adapter** (`services/persistence/session/stub.js`, `real.js`) — outside the engine.

Consequences the claim missed:

- `engine/test-support.js:17-24` drives the engine with a **plain object literal** (`{payload, params, query, state, headers}`). ~20 test files use it. The engine demonstrably runs against a POJO.
- **`analysis/simulate.js:1-15` imports `makeScope` from `engine/index.js` and walks the entire flow (sections → page gates → page list) with no request, no `h`, no server.**
- `dump.js` runs reconcile + entryComplete + sectionStatus + readyForCheckYourAnswers headless under `node`.

"Cannot be used without a hapi request object" is **false**. The true statement is narrower: *A's read/write facade is shaped like a hapi handler (it threads ambient `(request, h)` through), which is a signature/ergonomics tax, not a hapi dependency.*

---

## 3. The `@hapi` grep is the wrong probe — and it hides B's own coupling

**hapi couples via request decoration, not imports.** `@hapi/yar` is a server plugin that decorates `request.yar`. Consumer code **never imports it**. So `grep "@hapi"` structurally cannot detect the coupling it is being used to rule out. The claim's own phrasing — *"state.js's only hit is a COMMENT, not an import"* — is the tell.

`lib/state.js` (233 LOC) is B's **direct analogue of A's `engine/read.js` + `write.js`**: the state-access layer controllers call. Every one of its 9 exports takes `request` as its first parameter, and it dereferences `request.yar` at **8 production sites**:

```
lib/state.js:27   return request.yar?.get(SESSION_KEY) ?? {}
lib/state.js:31   request.yar?.set(SESSION_KEY, fulfilments)
lib/state.js:90   return request.yar?.get(NEXT_LINE_ID_KEY) ?? 1
lib/state.js:94   request.yar?.set(NEXT_LINE_ID_KEY, n)
lib/state.js:173  return request.yar?.get(NEXT_UNIT_ID_BY_LINE_KEY) ?? {}
lib/state.js:183  request.yar?.set(NEXT_UNIT_ID_BY_LINE_KEY, current)
lib/state.js:229-231  request.yar?.clear(...) ×3
```

Exports: `readFulfilments(request)`, `writeFulfilments(request, …)`, `readState(request)`, `writeAnswer(request, values)`, `addCommodityLine(request, …)`, `deleteCommodityLine(request, …)`, `addUnitRecord(request, …)`, `deleteUnitRecord(request, …)`, `resetState(request)`.

**Like-for-like, B's state layer is MORE hapi-coupled than A's engine, not less:**

| | A (`engine/`) | B (`lib/state.js`) |
|---|---|---|
| Direct `request.*` dereferences | **1** (guarded) | **8** |
| Session behind a swappable port? | **Yes** — `configureSession()` (`session.js:22`), 2 adapters (stub/real) | **No.** Hardcoded to `request.yar`. No port, no adapter, no injection |
| Failure mode on a non-hapi request | **Loud** — `unconfigured()` throws (`session.js:7-9`, `records.js:4-6`, `read.js:8-12`) | **Silent** — `request.yar?.` optional-chains; reads return `{}`, **writes vanish** |

The claim draws the boundary so that B's request-threading module falls outside "the model layer" and A's falls inside "the engine". That boundary is the whole result.

---

## 4. Draw the boundary symmetrically and B does not win — A machine-enforces what B only documents

Compare *model layer* to *model layer* (obligation manifest + evaluator + flow data):

```
grep -rln "request" .../live-animals/engine/evaluate registry.js → NO MATCHES
grep -rn  "request"  .../flow-layer/{obligations,domain,engine,flow,contract.js} → 1 hit, in a test name
```

**Both model layers are request-free and framework-free.** That is a tie, not a B win. And on *enforcement* A is ahead:

- **A has a boot-time, tested purity guard.** `obligation-purity.js:19-46` reads every `features/*/obligations.js` and throws if it imports anything but another `obligations.js` or a reference-data service — the error message names the banned categories: *"no view, request, controller, engine, validator or config"*. It runs at **boot** (`routes.js:20`) and in `obligation-purity.test.js`.
- **B's seam is a comment.** `contract.js:1-11`: *"Controllers and templates only call functions on this module."* No test enforces it, and per L2 §1 the documented enforcement grep has a false negative on the exact directory that violates it (nine `features/**` imports of `domain/index.js`).

So on the dimension's named axis — *is the model framework-free?* — **A is the side that proves it and B is the side that asserts it.**

The "5 mutable globals vs 1" line also inverts the reading: `records.js:8`, `session.js:11` and `read.js:7` are **setter-injection ports** (`configureRecords` / `configureSession` / `configureReadyForCheckYourAnswers`), each failing loud when unconfigured. They are the mechanism *by which* A's engine stays framework-agnostic. Weaker than constructor injection, yes — but calling them anti-pattern globals inverts what they do.

## 5. B's injection is also not as clean as claimed

`createObligationEvaluator({obligations})` is real and A has nothing like it. But `engine/index.js:27` hard-imports the concrete `domain` singleton, and `isValueFulfilled` (`:318-324`) calls `domain.get(oblId)` off that **module singleton** — while the sibling exports `optionsFor(…, domain, …)` and `validate(…, domain, …)` (`:41`, and the shadowed param) take domain as a parameter. So B's completeness/status primitives are bound to a concrete model artefact exactly as A's are. And `flow/flow.js:87` `export const flow` + `walkPages(node = flow)` is the same module-singleton-with-default-param shape as A's `registry.js` + `walk(answers, forest = all)`.

---

## What survives

1. A's read/write facade threads `(request, h)` through 10 of 13 exports — a real ergonomic tax, and the reason `engine/test-support.js` (68 LOC) and `engine/store.js` (12 LOC, 0 production importers) exist. Worth removing.
2. `engine/journey.js` genuinely inverts layering: it imports `BASE` from `config.js` and calls `server.state(...)`. That file does not belong in `engine/`.
3. B's `createObligationEvaluator({obligations})` is a better injection point than A's setter ports. Real, narrow, worth stealing.

None of that supports "cannot be used without hapi", and none of it supports "B wins outright".
