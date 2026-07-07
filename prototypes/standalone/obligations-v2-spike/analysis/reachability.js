import { pageOfObligation } from '../flow/dispatch.js'
import { reconcile } from '../engine/reconcile.js'
import { registry, walkObligations } from '../registry.js'
import { pathKey } from '../lib/path.js'
import { simulateJourney } from './simulate.js'

/**
 * MODEL-LEVEL reachability / dead-end prover (DISCUSSION-LOG entry 4), now at
 * FULL DEPTH (NW-5).
 *
 * Proves the property "no owed obligation is unreachable": there is no scope
 * state in which an obligation is in scope (owed) but the page that owns it
 * can never be reached under that same scope. The boot coverage assertion
 * proves every obligation is collected by exactly one page; this goes further
 * and proves that page is actually REACHABLE whenever the obligation is owed.
 *
 * DEPTH (NW-5). The original pass iterated `registry.all` (ROOTS ONLY) and
 * keyed `inScope` by BARE id, so NO sub-obligation at any depth was checked —
 * most sharply the item-conditional `windscreenProvider` (owed only when a
 * claim's own `claimType === 'windscreen'`), which no enumerated top-level
 * state ever puts in scope. Soundness at depth rested on an UNSTATED argument
 * (sub-owed => collection-in-scope => collection-page-reachable => sub
 * reachable); the prover now VERIFIES it rather than asserting it in prose.
 *
 * It stays tractable by REPRESENTATIVE-INSTANCE WITNESSING, not infinite
 * enumeration. For every obligation at every depth (`walkObligations()`) we
 * synthesise ONE minimal witness answers map that puts THAT obligation in
 * scope: an enumerated top-level activator state, plus a single representative
 * entry (index 0) for each collection ancestor on its path, plus its own
 * item-conditional sibling gate satisfied in that entry. Per-instance
 * independence means instance 0 generalises to instance n (they share a
 * derived owning page), so one representative per collection — the cost is
 * O(defs x item-conditional branches), never O(n^depth). We reconcile each
 * witness, ASSERT the target's INSTANCE path is in scope (a witness that fails
 * is a PROVER BUG surfaced as a problem, never a silent skip), then check its
 * derived owning page is reachable in the same witness's simulated journey.
 *
 * SOUNDNESS ASSUMPTION (why one witness suffices). A single witness generalises
 * only because every flow page/section `gate` is a PURE READ of `inScope` /
 * `readyForQuote` — so page reachability is a function of the very scope
 * predicate that owes the obligation, and any owing state reaches the page. If a
 * future `gate` ever keyed off an answer OUTSIDE the scope-owing condition, this
 * one-witness-per-obligation proof could false-pass; that would be the point to
 * enumerate more witnesses. True by the flow's current gating discipline.
 *
 * SCOPE OF THE PROOF (entry-4 tension, resolved). This reasons about PAGE
 * reachability under SCOPE, not input VALIDITY. Whether a given answer is
 * *valid* is not a model fact — it lives in the controller's Joi field-map, and
 * exposing that to the model layer would re-couple model<->controller, the exact
 * coupling v2's seams exist to avoid. Completion-readiness (`required` /
 * `requiredAtLeastOne`) stays a pure model fact and is provable; input-validity
 * deliberately is not. The witnesses set gate/sibling answers only to steer
 * SCOPE — they are not claims that those values are valid input.
 */

// The add-on picker's selectable slugs — DERIVED from the model, not re-typed.
// Every `includes` predicate that activates off the `addons` picker names one
// slug (the two `modifications` detail obligations share a slug, hence the
// dedupe). Reuses `walkObligations()` — already traversed here, so no new import
// edge — meaning the scope space tracks the model by construction: adding an
// add-on brings its slug into enumeration for free.
const addonsPicker = registry.byId('addons')
const ADDONS = [
  ...new Set(
    [...walkObligations()]
      .map(({ obligation }) => obligation.activatedBy)
      .filter((rule) => rule?.obligation === addonsPicker && 'includes' in rule)
      .map((rule) => rule.includes)
  )
]

const subsetsOf = (items) =>
  items.reduce(
    (subsets, item) => [
      ...subsets,
      ...subsets.map((subset) => [...subset, item])
    ],
    [[]]
  )

/**
 * Every combination of the scope-controlling TOP-LEVEL answers. Non-activating
 * answers are irrelevant to scope, so the space is exactly this cartesian
 * product. Sub-obligation scope is steered per-witness (representative entries +
 * item-conditional sibling gates), not by widening this top-level space.
 */
export function enumerateScopeStates() {
  const states = []
  for (const hadClaims of ['no', 'yes']) {
    for (const voluntaryExcess of ['no', 'yes']) {
      for (const coverType of ['', 'comprehensive']) {
        for (const addons of subsetsOf(ADDONS)) {
          states.push({ hadClaims, voluntaryExcess, coverType, addons })
        }
      }
    }
  }
  return states
}

/** The concrete value that satisfies a sibling item-conditional gate. */
const gateValue = (activatedBy) => {
  if ('equals' in activatedBy) return activatedBy.equals
  if ('includes' in activatedBy) return [activatedBy.includes]
  if ('present' in activatedBy) return activatedBy.present ? 'x' : ''
  return undefined
}

/**
 * Build the COLLECTION SCAFFOLD + INSTANCE PATH that witnesses one obligation
 * address. Walk the def chain root -> target: for every collection ANCESTOR
 * mint a single representative entry (index 0) so instance 0 stands in for
 * instance n; and for an item-conditional gate (an `activatedBy` on a SIBLING
 * field within the current item frame) set that sibling in the representative
 * entry (e.g. `claimType:'windscreen'` to owe `windscreenProvider`). Top-level
 * activators (a collection's own gate, e.g. `hadClaims`/`addons`) are left to
 * `enumerateScopeStates`. So the scaffold writes BOTH: a representative
 * collection entry (index 0) per ancestor AND, inside that entry, the
 * item-conditional sibling scalar that gates the target.
 */
function scaffoldFor(templatePath) {
  const segments = templatePath.split('.')
  const scaffold = {}
  const instancePath = []
  let forest = registry.all
  let frame = scaffold // where representative entries + sibling gates are written
  let inItem = false // true once we have descended into a collection item
  segments.forEach((id, i) => {
    const obligation = forest.find((candidate) => candidate.id === id)
    const gate = obligation.activatedBy
    // An item-conditional gate references a SIBLING in THIS item frame — satisfy it.
    if (inItem && gate && forest.includes(gate.obligation)) {
      frame[gate.obligation.id] = gateValue(gate)
    }
    const isAncestorCollection =
      obligation.collection && i < segments.length - 1
    if (isAncestorCollection) {
      const entry = {}
      frame[id] = [entry]
      frame = entry
      forest = obligation.item
      inItem = true
      instancePath.push(id, 0)
    } else {
      instancePath.push(id)
    }
  })
  return { scaffold, instancePath }
}

/**
 * The per-obligation PROOF PLAN: every non-system obligation at every depth,
 * paired with the minimal witness that puts its INSTANCE path in scope
 * (`answers` is null iff no enumerated state could — a prover bug). Exported so
 * a test can assert the plan actually reaches the item-conditional obligations
 * at BOTH depths (`claims[0].windscreenProvider`,
 * `drivers[0].claims[0].windscreenProvider`).
 */
export function buildWitnesses() {
  const states = enumerateScopeStates()
  const witnesses = []
  for (const { templatePath, obligation } of walkObligations()) {
    if (obligation.system) continue
    const { scaffold, instancePath } = scaffoldFor(templatePath)
    const targetKey = pathKey(instancePath)
    let answers = null
    for (const state of states) {
      const candidate = { ...state, ...scaffold }
      if (reconcile(candidate).inScope.has(targetKey)) {
        answers = candidate
        break
      }
    }
    witnesses.push({ templatePath, targetKey, answers })
  }
  return witnesses
}

/**
 * Returns the list of reachability problems — EMPTY means proven: every owed
 * obligation, at every depth, is reachable in a state that owes it. `pagesFor`
 * is injectable so a test can prove the prover has teeth (feed a flow that
 * drops a page — including a collection-hub page, to bite at depth).
 */
export function proveReachability({ pagesFor = simulateJourney } = {}) {
  const problems = []
  for (const { templatePath, targetKey, answers } of buildWitnesses()) {
    if (!answers) {
      problems.push({
        obligation: templatePath,
        targetKey,
        reason: 'no-witness-puts-in-scope'
      })
      continue
    }
    const pageId = pageOfObligation(targetKey)
    if (!pageId) {
      problems.push({
        obligation: templatePath,
        targetKey,
        reason: 'no-owning-page'
      })
      continue
    }
    if (!new Set(pagesFor(answers)).has(pageId)) {
      problems.push({
        obligation: templatePath,
        targetKey,
        pageId,
        reason: 'owning-page-unreachable-in-scope',
        answers
      })
    }
  }
  return problems
}
