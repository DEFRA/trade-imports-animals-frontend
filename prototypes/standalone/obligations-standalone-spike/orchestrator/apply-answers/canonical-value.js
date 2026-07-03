/**
 * Canonical-form storage per type (SHAPE-13/FLOW-10): strings trimmed,
 * currency reduced to plain digits when parseable, dates as
 * `{ day, month, year }` parts, multi-selects as arrays — an absent
 * multi-select key means answered-empty and stores `[]` (spike-a
 * parity). Plus the one slot-shaped write both the page writer and the
 * indexed add/remove lifecycle share.
 */

/** Scalar view of a possibly-array payload value (last submission wins). */
const scalarOf = (raw) => (Array.isArray(raw) ? raw.at(-1) : raw)

const trimmed = (raw) => String(scalarOf(raw) ?? '').trim()

/** Lenient parity parse: £1,200 stores as '1200'; junk stays as typed. */
const canonicalCurrency = (raw) => {
  const cleaned = trimmed(raw).replace(/[£,\s]/g, '')
  return /^\d+$/.test(cleaned) ? cleaned : trimmed(raw)
}

const dateParts = (inputName, payload) => {
  const parts = ['day', 'month', 'year'].map((part) => [
    part,
    payload[`${inputName}-${part}`]
  ])
  return parts.some(([, raw]) => raw !== undefined)
    ? Object.fromEntries(parts.map(([part, raw]) => [part, trimmed(raw)]))
    : undefined
}

const toArray = (value) => (Array.isArray(value) ? value : [value])

const canonicalMultiSelect = (raw) =>
  toArray(raw ?? [])
    .map((value) => String(value).trim())
    .filter((value) => value !== '')

/**
 * The canonical value one slot takes from a payload, or SKIP (undefined)
 * when the payload does not answer it — except multi-selects, where an
 * absent key IS the answered-empty answer.
 */
export const canonicalValue = (record, inputName, payload) => {
  if (record.type === 'date') {
    return dateParts(inputName, payload)
  }
  if (record.type === 'multi-select') {
    return canonicalMultiSelect(payload[inputName])
  }
  if (!Object.hasOwn(payload, inputName)) {
    return undefined
  }
  return record.type === 'currency'
    ? canonicalCurrency(payload[inputName])
    : trimmed(payload[inputName])
}

export const writeSlotValue = (fulfilments, record, fulfilmentId, value) => {
  fulfilments[record.id] =
    fulfilmentId === null
      ? { value }
      : { ...(fulfilments[record.id] ?? {}), [fulfilmentId]: { value } }
}
