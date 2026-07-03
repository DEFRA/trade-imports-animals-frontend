import { checkFormat, decodeDateParts, isBlank } from './format-checks.js'

/**
 * Save-time page gate, pure over its inputs. Per the mandate composition
 * table (engine/mandates.js) only a HARD page mandate on an in-scope,
 * blank obligation blocks Save and continue — per Rulings item 3 that is
 * fullName alone; every page-soft blank saves freely and surfaces at CYA
 * POST instead. Filled values additionally get format findings whatever
 * the mandate.
 *
 * A slot is one concrete input (the shape flow-eval/presents.js expands):
 *   { obligationId, name, type, inputName, mandate?: 'hard'|'soft',
 *     constraints?, value? }
 * `value` is the stored value; the POST payload overrides it per input
 * (the payload-merged candidate — so a bad value typed in THIS submit is
 * caught even before it is written).
 */

/** `mandate.<name>.missing` — the code a blank hard mandate emits. */
export const mandateMissingCode = (name) => `mandate.${name}.missing`

const hasPayloadValue = (slot, payload) => {
  if (slot.type === 'date') {
    return ['day', 'month', 'year'].some(
      (part) => `${slot.inputName}-${part}` in payload
    )
  }
  return Object.hasOwn(payload, slot.inputName)
}

/** The payload-merged candidate value for one slot. */
export const candidateValue = (slot, payload = {}) => {
  if (!hasPayloadValue(slot, payload)) {
    return slot.value
  }
  if (slot.type === 'date') {
    return decodeDateParts(slot.inputName, payload)
  }
  const raw = payload[slot.inputName]
  return slot.type === 'multi-select' ? [].concat(raw ?? []) : raw
}

/**
 * saveCheck(slots, payload, obligationState) -> findings. `obligationState`
 * is the id-keyed EvaluationResult obligations map; out-of-scope slots are
 * skipped entirely (a hidden reveal cannot block its own page).
 */
export const saveCheck = (slots, payload = {}, obligationState = {}) =>
  slots
    .filter((slot) => {
      const entry = obligationState[slot.obligationId]
      return !(entry && !entry.inScope)
    })
    .flatMap((slot) => {
      const value = candidateValue(slot, payload)
      if (isBlank(value)) {
        if ((slot.mandate ?? 'soft') !== 'hard') {
          return []
        }
        return [
          {
            inputName: slot.inputName,
            code: mandateMissingCode(slot.name),
            ...(slot.type === 'date' && { focusSuffix: '-day' })
          }
        ]
      }
      return checkFormat(slot, value).map((finding) => ({
        inputName: slot.inputName,
        ...finding
      }))
    })
