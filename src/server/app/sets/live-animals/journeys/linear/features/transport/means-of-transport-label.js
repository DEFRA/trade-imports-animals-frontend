import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const meansLabels = copyFor({ en, cy }).portOfEntry.means.options

/**
 * The label for a stored means of transport code.
 * @param {string} [code] - a stored means of transport code.
 * @returns {string} the label, or an empty string when the code has none.
 */
export const meansOfTransportLabel = (code) => meansLabels[code] ?? ''
