import { isBlank } from '../../validation/index.js'

/**
 * Spike-a's per-type CYA value formatting ('None' literal, as spike-a),
 * plus the option-label lookup the row builders share.
 */

export const optionLabel = (entry, value) =>
  (entry.options ?? []).find((option) => option.value === value)?.label

export const formatValue = (entry, record, value, ctx) => {
  const notProvided = ctx.cya.notProvidedText
  if (record.name === 'penaltyPoints' && isBlank(value)) {
    return ctx.cya.cyaCopy.penaltyPointsDefaultText
  }
  if (record.name === 'voluntaryExcess') {
    return value === 'yes'
      ? `£${ctx.valueOf('excessAmount') || '0'}`
      : ctx.cya.cyaCopy.voluntaryExcessNoneText
  }
  const byType = {
    boolean: () => (value === 'yes' ? 'Yes' : 'No'),
    radio: () => optionLabel(entry, value) ?? notProvided,
    select: () => optionLabel(entry, value) ?? notProvided,
    'multi-select': () => {
      const labels = []
        .concat(value ?? [])
        .map((item) => optionLabel(entry, item) ?? item)
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
