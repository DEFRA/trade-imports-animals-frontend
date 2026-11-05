import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { removeActionButton } from '../../../../../../../../common/components/remove-action-button.js'
import { actionsPrefixed } from '../../commodities/action-prefix.js'

const copy = copyFor({ en, cy })

const removeAction = actionsPrefixed('remove:')

export const removeButton = (index) =>
  removeActionButton({
    action: removeAction.actionFor(index),
    text: copy.remove,
    hiddenText: copy.removeHidden(index + 1),
    classes: 'govuk-!-margin-left-3'
  })

export const isRemoveAction = removeAction.isAction

export const removeIndexOf = (action) => Number(removeAction.keyOf(action))
