import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

export const REMOVE_ACTION_PREFIX = 'remove:'

// Submitting the page form carries the crumb, so no GET can trigger a removal.
export const removeButton = (index) =>
  `<button type="submit" class="govuk-link app-link-button govuk-!-margin-left-3" name="action" value="${REMOVE_ACTION_PREFIX}${index}">` +
  `${copy.remove}<span class="govuk-visually-hidden"> ${copy.removeHidden(index + 1)}</span></button>`

export const isRemoveAction = (action) =>
  action.startsWith(REMOVE_ACTION_PREFIX)

export const removeIndexOf = (action) =>
  Number(action.slice(REMOVE_ACTION_PREFIX.length))
