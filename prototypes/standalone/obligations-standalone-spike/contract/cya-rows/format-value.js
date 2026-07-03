import { isBlank } from '../../validation/index.js'

/**
 * Spike-a's per-type CYA value formatting ('None' literal, as spike-a),
 * plus the option-label lookup the row builders share.
 */

const RADIO_YES = 'yes'

export const optionLabel = (entry, value) =>
  (entry.options ?? []).find((option) => option.value === value)?.label

export const formatValue = (entry, record, value, context) => {
  const notProvided = context.cya.notProvidedText
  if (record.name === 'penaltyPoints' && isBlank(value)) {
    return context.cya.cyaCopy.penaltyPointsDefaultText
  }
  if (record.name === 'voluntaryExcess') {
    return value === RADIO_YES
      ? `£${context.valueOf('excessAmount') || '0'}`
      : context.cya.cyaCopy.voluntaryExcessNoneText
  }
  const byType = {
    boolean: () => (value === RADIO_YES ? 'Yes' : 'No'),
    radio: () => optionLabel(entry, value) ?? notProvided,
    select: () => optionLabel(entry, value) ?? notProvided,
    'multi-select': () => {
      const selected = Array.isArray(value)
        ? value
        : value == null
          ? []
          : [value]
      const labels = selected.map((item) => optionLabel(entry, item) ?? item)
      return labels.length ? labels.join(', ') : 'None'
    },
    date: () =>
      isBlank(value)
        ? notProvided
        : `${value.day}/${value.month}/${value.year}`,
    currency: () => (isBlank(value) ? notProvided : `£${value}`)
  }
  const format = byType[record.type]
  if (format) {
    return format()
  }
  return isBlank(value) ? notProvided : String(value)
}
