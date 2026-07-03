/**
 * Reconcile-on-load pruning (obligations.md:311-319, 690-720). The model
 * may have changed since the fulfilments were stored, so the evaluator
 * silently drops what no longer fits and returns the amended set plus the
 * drops as data — the orchestrator persists the set and logs the drops.
 * Pure and idempotent: pruning pruned output drops nothing.
 *
 * Storage convention (fixed for the spike): a single-cardinality entry is
 * `{ value }`; an indexed entry is `{ [fulfilmentId]: { value } }`.
 */

const CARDINALITY_SINGLE = 'single'

const REASON_UNKNOWN_OBLIGATION = 'unknown-obligation'
const REASON_CARDINALITY_MISMATCH = 'cardinality-mismatch'
const REASON_MALFORMED_FULFILMENT = 'malformed-fulfilment'

const isPlainObject = (candidate) =>
  typeof candidate === 'object' &&
  candidate !== null &&
  !Array.isArray(candidate)

const isValueEnvelope = (entry) =>
  isPlainObject(entry) && Object.hasOwn(entry, 'value')

const isIndexedEnvelope = (entry) =>
  isPlainObject(entry) && !Object.hasOwn(entry, 'value')

/** Filter stored fulfilments to the current model. */
export function pruneFulfilments(obligations, fulfilments = {}) {
  const byId = new Map(obligations.map((record) => [record.id, record]))
  const kept = {}
  const drops = []

  for (const [obligationId, entry] of Object.entries(fulfilments)) {
    const record = byId.get(obligationId)
    if (!record) {
      drops.push({ obligationId, reason: REASON_UNKNOWN_OBLIGATION })
      continue
    }

    if (record.cardinality === CARDINALITY_SINGLE) {
      if (isValueEnvelope(entry)) {
        kept[obligationId] = { value: structuredClone(entry.value) }
      } else {
        drops.push({
          obligationId,
          name: record.name,
          reason: REASON_CARDINALITY_MISMATCH
        })
      }
      continue
    }

    if (!isIndexedEnvelope(entry)) {
      drops.push({
        obligationId,
        name: record.name,
        reason: REASON_CARDINALITY_MISMATCH
      })
      continue
    }
    const inner = {}
    for (const [fulfilmentId, fulfilment] of Object.entries(entry)) {
      if (isValueEnvelope(fulfilment)) {
        inner[fulfilmentId] = { value: structuredClone(fulfilment.value) }
      } else {
        drops.push({
          obligationId,
          name: record.name,
          fulfilmentId,
          reason: REASON_MALFORMED_FULFILMENT
        })
      }
    }
    kept[obligationId] = inner
  }

  return { fulfilments: kept, drops }
}
