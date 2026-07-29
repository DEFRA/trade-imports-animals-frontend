import { fail } from './fail.js'
import { obligationsById } from './obligations/lookup.js'
import { recordsEntry } from './records/records-entry.js'
import { unknownStoredAsRecords } from './records/unknown-stored.js'
import { isObject } from './shape/object.js'
import { validateCurrentForm } from './validate/current-form.js'
import { validateObligationId } from './validate/obligation-id.js'
import { validateValue } from './validate/value.js'

/**
 * Convert the evaluator's UUID-keyed map to persisted obligation entries.
 *
 * The map's own key order becomes entry order. Record-map key order becomes
 * nested record order.
 *
 * @param {object} map evaluator fulfilments
 * @returns {Array<object>} persisted fulfilment entries
 */
export const encodeEvaluatorFulfilments = (map) => {
  if (!isObject(map)) {
    fail('evaluator fulfilments must be an object')
  }

  return Object.entries(map).map(([obligationId, stored]) => {
    validateObligationId(obligationId)
    const obligation = obligationsById.get(obligationId)

    if (obligation) {
      const form = obligation.within ? 'records' : 'value'
      validateCurrentForm(obligationId, form)
      if (form === 'records') {
        return recordsEntry(obligationId, stored, obligation)
      }
    } else if (unknownStoredAsRecords(stored)) {
      return recordsEntry(obligationId, stored)
    }

    validateValue(stored, `obligation ${obligationId}`)
    return { obligationId, value: stored }
  })
}
