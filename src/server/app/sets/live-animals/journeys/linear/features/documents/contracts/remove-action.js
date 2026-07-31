import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

export const REMOVE_ACTION_PREFIX = 'remove:'

// A removal deletes the backend upload, so it submits the page form — the
// crumb travels with it and no GET can trigger it.
export const removeButton = (index) =>
  `<button type="submit" class="govuk-link app-link-button" name="action" value="${REMOVE_ACTION_PREFIX}${index}">` +
  `${copy.remove}<span class="govuk-visually-hidden"> ${copy.removeHidden(index + 1)}</span></button>`

export const isRemoveAction = (action) =>
  action.startsWith(REMOVE_ACTION_PREFIX)

export const removeIndexOf = (action) =>
  Number(action.slice(REMOVE_ACTION_PREFIX.length))
