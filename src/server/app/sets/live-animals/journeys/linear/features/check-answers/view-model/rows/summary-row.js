import { isBlank } from '../../../../../../../../lib/answered.js'
import { notApplicableCell, valueText } from './value-text.js'

/** A row is a key and a value, and nothing else. */
export const row = (key, value) => ({
  key: { text: key },
  value: isBlank(value) ? notApplicableCell() : { text: valueText(value) }
})
