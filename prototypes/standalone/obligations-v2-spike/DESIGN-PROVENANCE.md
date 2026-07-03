# Design provenance — how v2's architecture was chosen

Phase 2 ran as a judge-panel workflow: **3 architects** each designed v2 from a distinct
angle, then **3 diverse-lens judges** independently scored all three and named grafts.

## Angles proposed

- **page-spine** — pages are the spine; each controller _declares_ the obligations it
  `collects`; boot inverts to a dispatch index; smallest state layer.
- **model-dispatch** — the obligation layer is the spine and carries a `page` pointer per
  def; a `definePage` factory drives GET/POST.
- **registry-seam** — a dedicated registry module holds the obligation↔page binding; a
  small `state/` leaf; pages call a `handle` helper.

## Verdict — unanimous winner: **page-spine**

| Lens                         | page-spine | model-dispatch | registry-seam |
| ---------------------------- | ---------- | -------------- | ------------- |
| Fidelity to v2 requirements  | **90**     | 83             | 84            |
| Simplicity / maintainability | **88**     | 74             | 72            |
| Implementability to green    | **88**     | 78             | 83            |

**Why it won.** It is the only model whose activation is a pure **data literal over real
const references** (`{ obligation: hadClaims, equals: 'yes' }`) — hitting "reads like
data" and "real references, no UUID ceremony" simultaneously. It is the only model with
**zero copy and zero presentation identity** on a def. Its narrow store API makes the
Yes→No→Yes scope-exit wipe (the trickiest acceptance) **correct by construction** — a page
cannot express or bypass a wipe. Lowest blast radius: controllers own their GET/POST and
call the kit as a _library_, unlike model-dispatch's `definePage` lifecycle (one bug →
many pages).

**Rejected trade-offs.** model-dispatch was most literal on "the model indexes to a page"
but put presentation identity on the def and its `definePage` factory carried the highest
"re-emergent generic engine" risk. registry-seam was architecturally elegant (a true
acyclic `state/` leaf) but reintroduced **string-id references** (the ceremony the brief
steers away from) and leaked **task-link copy** into the registry.

## Grafts folded into the final design (from the losing proposals)

1. **Boot coverage assertions** (model-dispatch + registry-seam): every non-system
   obligation is `collects`-ed by exactly one page; every `collects` ref resolves; two
   pages claiming one obligation is a startup crash. Closes page-spine's one real gap
   (page-side binding could silently drift).
2. **Model-purity guard** (model-dispatch): the obligations registry imports only
   `types`/`predicate` — no view/request/error imports — so "no copy/behaviour in defs"
   is enforced, not conventional.
3. **`required` vs `saveBlocking` split made mechanical** (model-dispatch): only
   `fullName` is save-blocking; `required` governs completion/quote-readiness, checked at
   the hub/CYA, never at page-save — which is exactly what lets the mandatory-fields spec
   pass.
4. **Claims framing** (model-dispatch): "instances are a pure function of array length —
   no id ledger, no orphans" — identity minted on append.
5. **Index-parameterised repeating route** (registry-seam): the add-form-has-no-id case is
   stated explicitly (`index == null` → add, else edit/remove).
6. **Acyclic dependency invariant** (registry-seam): `state/` is a leaf; pages import
   state, never the reverse — documented and asserted.

## Residual risks carried (from the judges), and how v2 answers them

- _Predicate vocab is thin_ — accepted; `equals/includes/present` covers this journey, and
  anything needing branching is pushed to a controller by design.
- _`pattern`/`options` on the model is borderline validation-in-model_ — kept minimal:
  the model carries only structural constraints (format/value-domain); message text and
  cross-field rules live in per-page controllers.
- _Exact-DOM copy lives only in templates_ — inherent to per-page control; the three
  shared Playwright specs are run as the guard (Phase 4).
