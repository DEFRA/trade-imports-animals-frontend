import { createIdentifierIndex } from './identifiers.js'
import { pruneFulfilments } from './prune.js'
import { journeyScopeRegistry } from './scope/index.js'

/**
 * The pure, sync, zero-I/O ObligationEvaluator — the advertised IP
 * (obligations.md:262-322). Pipeline: prune -> name view -> named scope
 * predicates -> most-restrictive mandate -> stacked authored reasons ->
 * per-fulfilment states. Deterministic, Flow-ignorant, and it never mints
 * fulfilment ids: indexed ids in the output come only from stored keys
 * (user/seeded) or the controller's answer values (derived).
 *
 * EvaluationResult extends the doc shape with per-obligation and
 * per-fulfilment `fulfilled` booleans — the agreed flow-eval interface —
 * plus the prune `drops` so the orchestrator can log them.
 *
 * Fulfilled-ness conventions (parity-driven):
 * - single: a non-blank stored value; an answered EMPTY array still counts
 *   (spike-a treats answered-but-empty extras/addons as satisfied).
 * - indexed user/seeded: the collection has at least one fulfilment —
 *   per-item gaps surface as per-fulfilment states, not obligation gaps
 *   (spike-a counts a typeless claim).
 * - indexed derived: one fulfilment is projected per selected controlling
 *   value and every projected fulfilment needs a non-blank value.
 *
 * Sized just over the 150-line cap by design — DESIGN-DECISION graft 8
 * accepts ~170 lines over smearing the prune/scope/mandate interplay.
 */

const hasValue = (value) => {
  if (value === undefined || value === null) {
    return false
  }
  if (typeof value === 'string') {
    return value.trim() !== ''
  }
  if (Array.isArray(value)) {
    return true
  }
  if (typeof value === 'object') {
    return Object.values(value).some(hasValue)
  }
  return true
}

/** The name view scope predicates author against (storage stays id-keyed). */
const makeNameView = (identifiers, fulfilments) => ({
  valueOf(name) {
    return fulfilments[identifiers.idOf(name)]?.value
  },
  fulfilmentsOf(name) {
    const record = identifiers.recordOfName(name)
    if (record.cardinality !== 'indexed') {
      throw new Error(`Obligation "${name}" is not indexed`)
    }
    return fulfilments[record.id] ?? {}
  }
})

/**
 * Fold rule firings, most restrictive wins. No registered rules means the
 * obligation is always applicable and optional; registered rules that all
 * decline mean out of scope.
 */
const foldScope = (rules, view, externalState) => {
  if (rules.length === 0) {
    return { inScope: true, status: 'optional', reasons: [] }
  }
  const firings = rules
    .map(({ when }) => when(view, externalState))
    .filter((outcome) => outcome)
  if (firings.length === 0) {
    return { inScope: false }
  }
  const mandatory = firings.some((outcome) => outcome.status === 'mandatory')
  const reasons = firings.flatMap((outcome) => outcome.reasons ?? [])
  return {
    inScope: true,
    status: mandatory ? 'mandatory' : 'optional',
    reasons
  }
}

/** Projected fulfilment ids: stored keys, or the controller's selection. */
const projectFulfilmentIds = (record, entry, fulfilments) => {
  const { source, controllingObligation, controllingValue } = record.indexedBy
  if (source !== 'derived') {
    return Object.keys(entry ?? {})
  }
  const answer = fulfilments[controllingObligation]?.value
  const selected = Array.isArray(answer) ? answer : []
  return selected.filter((value) => value === controllingValue)
}

const evaluateIndexed = (record, entry, fulfilments) => {
  const states = projectFulfilmentIds(record, entry, fulfilments).map(
    (fulfilmentId) => ({
      fulfilmentId,
      fulfilled: hasValue(entry?.[fulfilmentId]?.value)
    })
  )
  const fulfilled =
    record.indexedBy.source === 'derived'
      ? states.length > 0 && states.every((state) => state.fulfilled)
      : states.length > 0
  return { fulfilled, fulfilments: states }
}

/**
 * evaluateObligations(obligations, fulfilments) -> EvaluationResult.
 * `options.scopeRegistry` (default: the journey registry) and
 * `options.externalState` (default: {}) exist for fixtures and the
 * expressiveness demos — production callers pass neither.
 */
export function evaluateObligations(
  obligations,
  fulfilments = {},
  options = {}
) {
  const { scopeRegistry = journeyScopeRegistry, externalState = {} } = options
  const identifiers = createIdentifierIndex(obligations)
  const { fulfilments: amended, drops } = pruneFulfilments(
    obligations,
    fulfilments
  )
  const view = makeNameView(identifiers, amended)

  const result = {}
  for (const record of obligations) {
    const scope = foldScope(
      scopeRegistry.rulesFor(record.name),
      view,
      externalState
    )
    const indexed = record.cardinality === 'indexed'
    if (!scope.inScope) {
      result[record.id] = {
        name: record.name,
        inScope: false,
        reasons: [],
        fulfilled: false,
        ...(indexed && { fulfilments: [] })
      }
      continue
    }
    const entry = amended[record.id]
    result[record.id] = {
      name: record.name,
      inScope: true,
      status: scope.status,
      reasons: scope.reasons,
      ...(indexed
        ? evaluateIndexed(record, entry, amended)
        : { fulfilled: hasValue(entry?.value) })
    }
  }

  return { fulfilments: amended, drops, obligations: result }
}
