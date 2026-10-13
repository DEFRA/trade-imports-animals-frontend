import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

/**
 * A saved template's title: its name, or 'Untitled template' when it was saved
 * with none.
 *
 * @param {string|undefined} name - the name the template was saved with
 * @returns {string} the title to show
 */
export const templateTitle = (name) => (name?.trim() ? name : copy.untitled)
