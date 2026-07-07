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

// Derived from the model via walkObligations, never re-typed — adding an
// add-on enters the enumeration for free.
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
 * Non-activating answers are irrelevant to scope, so this cartesian product is
 * the complete top-level space — a new top-level activator obligation must be
 * added here or the prover silently under-enumerates.
 */
export const enumerateScopeStates = () =>
  ['no', 'yes'].flatMap((hadClaims) =>
    ['no', 'yes'].flatMap((voluntaryExcess) =>
      ['', 'comprehensive'].flatMap((coverType) =>
        subsetsOf(ADDONS).map((addons) => ({
          hadClaims,
          voluntaryExcess,
          coverType,
          addons
        }))
      )
    )
  )

const gateValue = (activatedBy) => {
  if ('equals' in activatedBy) return activatedBy.equals
  if ('includes' in activatedBy) return [activatedBy.includes]
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
