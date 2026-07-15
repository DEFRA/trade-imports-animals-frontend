# L3 — flow-navigation — claim FN-5 — adversarial verification

**Verdict: AMENDED.** The B half is exact. The A half is the classic "not built ⇒ cannot be
built" error — and worse than usual, because A **had it built and deliberately deleted it**.

---

## 1. The cited B evidence — verified, all of it

| Cite | Status |
|---|---|
| `routes.js:139-154` | REAL. `:150-205` is the generator. `:159/:166` emit `/lines/{lineId}/units/{unitId}/${page.page}`; `:176/:183` emit `/lines/{lineId}/${page.page}`; `:194/:201` emit the static `/pages/${page.page}`. |
| `routes.js:154` branches on object identity | REAL, verbatim: `if (page.presentsForEach.forEachOf === unitRecord) {`. Depth is a hard-coded `if`, not data. |
| `contract.js:135` `nextAfterForLine`, `:152` `nextAfterForUnit` | REAL, and they return typed targets `{ kind: 'line-page', page, lineId }` / `{ kind: 'unit-page', page, lineId, unitId }`. |
| three factories 111 / 141 / 179 LOC | REAL (`wc -l`: page-controller 111, line-page-controller 141, unit-page-controller 179). |

Additional B evidence the claim did not cite but which strengthens it: `presentsForEach` is a
**declared flow-model attribute**, not a routing hack — `flow/flow.js:439-560` carries **14**
declarations (5 × `forEachOf: commodityLine`, 9 × `forEachOf: unitRecord`), and `flow/flow.js:12`
states the semantics ("expands to one virtual entry per in-scope [instance]"). The instance-scoped
CYA Change link is **derived from the same declaration**:
`features/check-your-answers/controller.js:115-127` — `hrefForChange(oblId, lineId, unitId)` takes
`changeLinkFor(oblId)` and rebuilds `${BASE}/lines/${lineId}/units/${unitId}/${changePage.page}`.
So B derives route + next-page + change-link from one declaration. That is real and it is the
thing A does not have.

## 2. The cited A evidence — verified, but it does not support the conclusion drawn from it

| Cite | Status |
|---|---|
| `config.js:6` `pagePath = (slug) => \`${BASE}/${slug}\`` | REAL. No parameter binding. |
| `flow/dispatch.js:15-24` strips `[n]` | REAL: `:16` `let current = address.replace(/\[\d+\]/g, '')`, then an ancestor walk. So `pageOfObligation` can only ever name a **page**, never an instance. |
| `animal-identification.controller.js` = 566 LOC, routes at `:558-566` | REAL (`wc -l` = 566; `:562` `path: pagePath(\`${page.slug}/{line}/{unit}/remove\`)`). |

But "A has no representation for this" is **false**, and the causal "so A collapses the same
requirement into one mega-page" is **false**.

### 2.1 Counter-example: A shipped instance-scoped pages with generated URL params

`git log --diff-filter=D` on `features/commodities` names commit **c627618** (inc-063), which
DELETED `animal-identifiers.list.controller.js` and `animal-identifiers.entry.controller.js`.
Recovered at `c627618^`:

- list controller `:102-111`
  ```js
  export const routes = [
    { method: 'GET',  path: pagePath('commodities/{index}/identifiers'), ... },
    { method: 'POST', path: pagePath('commodities/{index}/identifiers'), ... }
  ]
  ```
  with `:29` `const index = Number(request.params.index)`.
- entry controller `:345-360` — `commodities/{index}/identifiers/add` (GET+POST) and
  `commodities/{index}/identifiers/{unit}/remove`; `:142` `request.params.index`, `:338`
  `request.params.unit`.

That is exactly B's shape: a page template instantiated per commodity line, addressed by a
generated URL param. 115 + 364 = **479 LOC** — *less* than the 566-LOC mega-page that replaced it.

### 2.2 Counter-example: A's forward primitive DID sequence into an instance page

The opening run's step target is a **function of scope returning a path**, not a slug. At
`c627618^`, `flow/run.js:32-38`:

```js
{
  id: ANIMAL_IDENTIFIERS_STEP,
  target: (scope) =>
    scope.answered('commodityLines') ? pagePath('commodities/0/identifiers') : null
}
```

So instance-bound forward navigation is expressible **in A's existing config vocabulary**. It was
hard-coded to line 0 — a build shortcut, not a wall.

### 2.3 A still ships instance-parameterised routes today

`consignment-details.controller.js:203` (`{commodity}/remove`), `documents/controller.js:354`
(`accompanying-documents/{index}/remove`), `animal-identification.controller.js:562`
(`{line}/{unit}/remove`). Hapi param routes are routine in A; they just hang off a page as
bespoke actions.

### 2.4 The mega-page is a DESIGN RULING, not a model collapse — this kills the claim's "so"

`DESIGN-DELTA.md:715-717` (§15, inc-063):
> "**The single identification surface (D16, design 01-16/17 + 03-01/02).** The per-line identifier
> list+entry pages are RETIRED. One page replaces them — `animalIdentification`
> (`commodities/identification`), a card per species line…"

and `DESIGN-DELTA.md:642` (§14, inc-062):
> "**Pages (D15, design 01-10..15).** The one-line-at-a-time select/details loop is RETIRED."

A moved **away from** per-instance pages because the interaction design (Figma 01-10..17, ruling
c-031) asked for a single card surface. The 566-LOC page is what the design wanted. Any claim that
A's model *forced* it does not survive `git show`.

### 2.5 A's engine is instance-aware; it is the FLOW layer that throws the instance away

`engine/evaluate/reconcile.js` produces per-instance scope keys —
`engine/evaluate/cross-frame.test.js:57` asserts
`inScope.has('commodityLines[0].animalIdentifiers[0].permanentAddress')` and `:253-255` asserts two
sibling lines differ. The model can say "this line's page applies and that one's does not". The
flow layer cannot consume it: `flow/gates.js:21-28` takes journey-wide `scope` and page-level
`collects` (bare obligation ids), so `pageGatePasses` has no instance parameter.

## 3. What IS true, and structural, in A

- **A has no declarative instance-scoped page primitive.** A flow page is `{ id, slug }`
  (`features/commodities/page.js:1-11`); `pagePath` does no binding; `nextInSection`
  (`flow/navigation.js:20-28`) returns `pagePath(next.slug)` with no instance in scope to bind.
- **Instance pages in A live OUTSIDE the model.** The retired list/entry controllers exported
  `routes` but **no `meta`** — `features/index.js` at `c627618^:33-52` omits them from
  `dispatchPages`. So they got no derived route, no derived gate, no derived next-page and no
  derived change link. They were a bespoke wing bolted onto the spine, exactly as `party-picker`
  is today (`party-picker.controller.js:170-183`, routes fanned out over a *static* `PARTIES` list).
- **The derived Change link cannot name an instance** (`dispatch.js:16` strips `[n]`), so A
  hand-writes them: `check-answers/controller.js:233-240` builds
  `` `${withChange(pagePath(animalIdentificationPage.slug))}#identification-card-${index}` `` — an
  **anchor fragment**, not a path param. Compare B's derived `hrefForChange` (`:115-127`).
- Both A pages in the commodity area declare `collects: []`
  (`animal-identification.controller.js:20`, `consignment-details.controller.js:14`), so the whole
  `commodityLines` subtree is owned by the *search* page for dispatch purposes — A's index has no
  vocabulary for "the page that edits line 3".

## 4. What is true about B's cost — the claim states it accurately

Depth **is** hard-coded in the browser layer: `routes.js:154` `=== unitRecord` (object identity),
three controller factories, three `nextAfterFor*`, three `firstUnfulfilledPageFor*`, and CYA
hard-codes the `/lines/{}/units/{}` shape at `:124-126`. A depth-3 group costs a fourth of each.

## 5. Net

The asymmetry is real but it is **declarative vs bespoke**, not **possible vs impossible**. B can
declare an instance page and get routes + navigation + change links free; A must hand-build each
one and gets nothing derived. That is a genuine and valuable win for B, and it is the right thing
to take into option C. But "A cannot represent instance-scoped pages" is refuted by A's own git
history, and "so A collapses the requirement into a mega-page" inverts cause and effect: the
mega-page is the design, and A deleted 479 LOC of working per-instance pages to get there.

## What I searched

- `grep -rn "path:"` across A's `features/` — found 3 live instance-parameterised routes.
- `git log --diff-filter=D --name-only` on A's `features/commodities` → commit c627618 / 33b1e80.
- `git show c627618^:…` for the retired list/entry controllers, `flow/run.js`, `features/index.js`,
  `features/commodities/page.js`.
- `grep -rn "collects"` across A's `features/` — the two commodity pages collect nothing.
- `grep -rn "inScope"` across A's `engine/` — per-instance scope keys confirmed in cross-frame.test.
- `grep -rn "presentsForEach"` across B — 14 flow declarations + the routes generator.
- Read B's `routes.js` whole, `contract.js:100-166`, `check-your-answers/controller.js` change-link
  construction.
- `wc -l` on every LOC figure the claim quotes (566 / 111 / 141 / 179 — all correct).
