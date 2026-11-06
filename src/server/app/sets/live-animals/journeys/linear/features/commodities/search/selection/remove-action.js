import { actionsPrefixed } from '../../action-prefix.js'

const removeAction = actionsPrefixed('remove:')

export const removeActionFor = removeAction.actionFor
export const isRemoveAction = removeAction.isAction
export const removeKeyOf = removeAction.keyOf
