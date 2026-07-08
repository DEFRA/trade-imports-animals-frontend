import { pageOfObligation } from '../flow/dispatch.js'
import { reconcile } from '../engine/evaluate/reconcile.js'
import { registry, walkObligations } from '../registry.js'
import { pathKey } from '../lib/path.js'
import { simulateJourney } from './simulate.js'

/**
 * Proves "no owed obligation is unreachable": one minimal witness per
 * obligation at every depth.
 *
 * SOUNDNESS: one witness per obligation suffices only because every flow gate
 * is a pure read of `inScope` — every section/page gate now derives from
 * collects (the last authored gate, get-your-quote's `readyForQuote`, went in
 * inc-028). If a future gate keys off an answer outside the scope-owing
 * condition, this proof can false-pass — that is the point to enumerate more
 * witnesses.
 */

/**
 * Non-activating answers are irrelevant to scope, so this cartesian product is
 * the complete top-level space — a new TOP-LEVEL activator obligation must be
 * added here or the prover silently under-enumerates.
 *
 * Frame-gated activators are NOT enumerated here: they do not live at the top
 * level. containsUnweanedAnimals gates on `commoditySelection`, a commodityLines
 * ITEM field (frame:"anyItem"), which cannot be a scalar cartesian axis. Its
 * triggering state is seeded structurally, per witness, by `scaffoldFor`
 * (one triggering collection entry) — so this list stays a top-level product.
 */
export const enumerateScopeStates = () =>
  ['no', 'yes'].flatMap((regionOfOriginCodeRequirement) =>
    ['', 'internal-market'].flatMap((reasonForImport) =>
      // 'Road Vehicle' is one of transitedCountries' two activating values —
      // either member of the includes-list witnesses the activated side.
      ['', 'Road Vehicle'].flatMap((meansOfTransport) =>
        // The commercial and private transporter spokes activate on DIFFERENT
        // equals-values, so (unlike an includes-list) one non-blank value
        // cannot witness both branches — the axis carries all three.
        ['', 'Commercial transporter', 'Private transporter'].map(
          (transporterType) => ({
            regionOfOriginCodeRequirement,
            reasonForImport,
            meansOfTransport,
            transporterType
          })
        )
      )
    )
  )

/**
 * Roots whose activator obligation is no longer registered can never enter
 * scope: the feature that collected the activating answer was removed and
 * nothing writes it any more (the activator survived only as a module-local
 * identity stub in the dependent feature's obligations.js). Such roots were
 * intentionally unreachable while they awaited their own removal increment, so
 * they dropped out of the proof rather than reporting as prover bugs. The set
 * emptied as the stub-bearing car features were deleted: named-driver (inc-025),
 * modifications (inc-026), `addons`-gated protected-ncd (inc-027), and finally
 * the `coverType`-gated `premium` with the whole quote feature (inc-028). It is
 * now EMPTY — no car-domain features remain, so every registered activator
 * resolves to a registered obligation. The mechanism is kept as a live guard:
 * if a future feature ever leaves an unregistered activator behind, its root
 * re-enters this set instead of failing the prover.
 *
 * Membership is checked against EVERY registered obligation at any depth (via
 * walkObligations), not just the top-level `registry.all`: a frame-gated root
 * like containsUnweanedAnimals activates on `commoditySelection`, which is a
 * commodityLines ITEM field, not a top-level obligation. A depth-only lookup
 * would wrongly orphan it; walking the whole forest recognises the activator.
 */
const registeredObligations = new Set(
  [...walkObligations()].map((node) => node.obligation)
)

export const orphanedRootIds = new Set(
  registry.all
    .filter(
      (obligation) =>
        obligation.activatedBy &&
        !registeredObligations.has(obligation.activatedBy.obligation)
    )
    .map((obligation) => obligation.id)
)

const gateValue = (activatedBy) => {
  if ('equals' in activatedBy) return activatedBy.equals
  // Any single member of a (possibly list-valued) `includes` target satisfies
  // the intersection predicate, so the witness answers with the first.
  if ('includes' in activatedBy) return [].concat(activatedBy.includes)[0]
  if ('present' in activatedBy) return activatedBy.present ? 'x' : ''
  return undefined
}

function scaffoldFor(templatePath) {
  const segments = templatePath.split('.')
  const scaffold = {}
  const instancePath = []
  // Innermost-last stack of the frames materialised so far, each pairing the
  // concrete object being built with the obligation list walked at that depth —
  // so an enclosing gate can be seeded on the correct ancestor frame.
  const frameStack = [{ frame: scaffold, forest: registry.all }]
  let inItem = false
  segments.forEach((id, i) => {
    const { frame, forest } = frameStack[frameStack.length - 1]
    const obligation = forest.find((candidate) => candidate.id === id)
    const gate = obligation.activatedBy
    // An item-conditional gate references a SIBLING in THIS item frame — satisfy it.
    if (inItem && gate && forest.includes(gate.obligation)) {
      frame[gate.obligation.id] = gateValue(gate)
    }
    // A frame:"anyItem" gate references a field in the ITEMS of a collection
    // living in this frame — seed ONE triggering entry so ANY-item holds.
    if (gate?.frame === 'anyItem') {
      const collection = forest.find((candidate) =>
        candidate.item?.includes(gate.obligation)
      )
      if (collection) {
        frame[collection.id] = [{ [gate.obligation.id]: gateValue(gate) }]
      }
    }
    // A frame:"enclosing" gate references a field in an ANCESTOR frame — seed
    // its triggering value on the nearest enclosing frame that holds it, so a
    // gated unit field (permanentAddress) enters scope. Backwards compatible:
    // no live obligation used frame:"enclosing" before inc-035.
    if (gate?.frame === 'enclosing') {
      for (let d = frameStack.length - 1; d >= 0; d--) {
        if (frameStack[d].forest.includes(gate.obligation)) {
          frameStack[d].frame[gate.obligation.id] = gateValue(gate)
          break
        }
      }
    }
    const isAncestorCollection =
      obligation.collection && i < segments.length - 1
    if (isAncestorCollection) {
      const entry = {}
      frame[id] = [entry]
      frameStack.push({ frame: entry, forest: obligation.item })
      inItem = true
      instancePath.push(id, 0)
    } else {
      instancePath.push(id)
    }
  })
  return { scaffold, instancePath }
}

/**
 * `answers` is null iff no enumerated state puts the target in scope — a
 * prover bug, surfaced as a problem, never a silent skip.
 */
export function buildWitnesses() {
  const states = enumerateScopeStates()
  const witnesses = []
  for (const { templatePath, obligation } of walkObligations()) {
    if (obligation.system) continue
    if (orphanedRootIds.has(templatePath.split('.')[0])) continue
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

/** Returns the list of reachability problems — empty means proven. */
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
