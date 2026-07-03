import { createIdentifierIndex } from '../../engine/identifiers.js'
import { expandSlots } from '../../flow-eval/index.js'
import { canonicalValue, writeSlotValue } from './canonical-value.js'
import { encodeFieldName } from './field-names.js'

const FILE_RECORD_TYPE = 'file'

/**
 * Canonicalise-and-write for POST answers. Pure on inputs. Writes are
 * deliberately scope-blind: a slot the pre-write evaluation had out of
 * scope still writes (the excessAmount reveal answered in the SAME post
 * as the voluntaryExcess flip); the fixed-point wipe reconciles
 * afterwards.
 */

/**
 * applyAnswers(obligations, page, evaluation, payload) -> new fulfilments.
 * One write per answered non-file slot of the page, over the evaluation's
 * (pruned) fulfilments.
 */
export const applyAnswers = (obligations, page, evaluation, payload = {}) => {
  const identifiers = createIdentifierIndex(obligations)
  const fulfilments = structuredClone(evaluation.fulfilments ?? {})
  for (const slot of expandSlots(page, evaluation)) {
    const record = identifiers.recordOfId(slot.obligationId)
    if (record.type === FILE_RECORD_TYPE) {
      continue // Render-only (vehiclePhoto parity): never written.
    }
    const inputName = encodeFieldName(slot.name, slot.fulfilmentId)
    const value = canonicalValue(record, inputName, payload)
    if (value !== undefined) {
      writeSlotValue(fulfilments, record, slot.fulfilmentId, value)
    }
  }
  return fulfilments
}
