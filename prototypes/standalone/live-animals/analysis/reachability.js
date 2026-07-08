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
 * is a pure read of `inScope` / `readyForQuote`. If a future gate keys off an
 * answer outside the scope-owing condition, this proof can false-pass — that
 * is the point to enumerate more witnesses.
 */

/**
 * Non-activating answers are irrelevant to scope, so this cartesian product is
 * the complete top-level space — a new top-level activator obligation must be
 * added here or the prover silently under-enumerates.
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
 * nothing writes it any more (the activator survives only as a module-local
 * identity stub in the dependent feature's obligations.js). They are
 * intentionally unreachable while they await their own removal increment
 * (inc-025..027), so they drop out of the proof rather than reporting as
 * prover bugs. This set empties as the stub-bearing features are deleted.
 */
const orphanedRootIds = new Set(
  registry.all
    .filter(
      (obligation) =>
        obligation.activatedBy &&
        !registry.all.includes(obligation.activatedBy.obligation)
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
  let forest = registry.all
  let frame = scaffold
  let inItem = false
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
