import { isReviewedEmptyCollection } from './collection-review.js'

/**
 * Graft 16 — Container-level appliesWhen gating (obligations.md:1169-1197).
 * Gating is a Flow concern: Sections and Pages in flow.json carry named
 * conditions, resolved here against ObligationEvaluator output — never
 * against raw journey state and never on the obligation record (that is
 * engine scoping, a separate dimension).
 *
 * The registry seam is injectable so fixtures can gate non-car-insurance
 * trees; the journey registry below covers the closed name list in
 * model/flow.json. Unknown names throw loudly.
 */

/** Look a stored value up by obligation name through the evaluation. */
const valueByName = (evaluation, name) => {
  for (const [obligationId, entry] of Object.entries(evaluation.obligations)) {
    if (entry.name === name) {
      return evaluation.fulfilments[obligationId]?.value
    }
  }
  return undefined
}

/**
 * Registry of named Flow conditions. A condition is
 * `(evaluation) -> boolean`. `defineFamily` registers a parameterised
 * prefix (`addonSelected:<value>`) whose builder returns the condition
 * for one argument.
 */
export function createFlowConditionRegistry() {
  const named = new Map()
  const families = new Map()

  return {
    define(name, condition) {
      named.set(name, condition)
    },
    defineFamily(prefix, build) {
      families.set(prefix, build)
    },
    resolve(name) {
      if (named.has(name)) {
        return named.get(name)
      }
      const separator = name.indexOf(':')
      if (separator > 0) {
        const build = families.get(name.slice(0, separator))
        if (build) {
          return build(name.slice(separator + 1))
        }
      }
      throw new Error(`Unknown appliesWhen condition "${name}"`)
    }
  }
}

/** The journey's closed condition list (asserted against model/flow.json). */
export function createJourneyFlowConditions() {
  const registry = createFlowConditionRegistry()

  registry.define(
    'hadClaimsIsYes',
    (evaluation) => valueByName(evaluation, 'hadClaims') === 'yes'
  )

  // Parity ruling c — Get your quote unlocks when every in-scope
  // engine-mandatory obligation is fulfilled (spike-a's allComplete —
  // which counts a reviewed-but-empty collection, claimsDone with 0
  // claims, as complete on the hub while the CYA POST still blocks).
  registry.define('quoteReady', (evaluation) =>
    Object.entries(evaluation.obligations).every(
      ([obligationId, entry]) =>
        !entry.inScope ||
        entry.status !== 'mandatory' ||
        entry.fulfilled ||
        isReviewedEmptyCollection(obligationId, entry, evaluation.fulfilments)
    )
  )

  registry.defineFamily('addonSelected', (addon) => (evaluation) => {
    const selected = valueByName(evaluation, 'addons')
    return Array.isArray(selected) && selected.includes(addon)
  })

  return registry
}

export const journeyFlowConditions = createJourneyFlowConditions()

/**
 * Does this Container apply in the current state? Containers without an
 * `appliesWhen` name always apply (including the Flow root).
 */
export function containerApplies(
  container,
  evaluation,
  conditions = journeyFlowConditions
) {
  if (!container.appliesWhen) {
    return true
  }
  return conditions.resolve(container.appliesWhen)(evaluation)
}
