import { isBlank } from '../../../../../../../../lib/answered.js'
import { notApplicableCell, valueText } from './value-text.js'

export const row = (key, value) => ({
  key: { text: key },
  value: isBlank(value) ? notApplicableCell() : { text: valueText(value) }
})
