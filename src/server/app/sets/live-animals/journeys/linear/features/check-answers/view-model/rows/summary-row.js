import { isBlank } from '../../../../../../../../lib/answered.js'
import { notApplicableCell, valueText } from './value-text.js'

/** A row is a key and a value, and nothing else. Design release 1 puts no
 * Change link on a row — the card heading carries the one link that changes
 * every answer inside it, so the page offers one link per card rather than one
 * per answer. */
export const row = (key, value) => ({
  key: { text: key },
  value: isBlank(value) ? notApplicableCell() : { text: valueText(value) }
})
