import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { removeActionButton } from '../../../../../../../../common/constants/table-cells.js'

const copy = copyFor({ en, cy })

export const REMOVE_ACTION_PREFIX = 'remove:'

export const removeButton = (index) =>
  removeActionButton({
    action: `${REMOVE_ACTION_PREFIX}${index}`,
    text: copy.remove,
    hiddenText: copy.removeHidden(index + 1),
    classes: 'govuk-!-margin-left-3'
  })

export const isRemoveAction = (action) =>
  action.startsWith(REMOVE_ACTION_PREFIX)

export const removeIndexOf = (action) =>
  Number(action.slice(REMOVE_ACTION_PREFIX.length))
