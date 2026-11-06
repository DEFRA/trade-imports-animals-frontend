import { actionsPrefixed } from '../../action-prefix.js'

const removeAction = actionsPrefixed('remove:')
const removeSpeciesAction = actionsPrefixed('remove-species:')

export const removeActionFor = removeAction.actionFor
export const isRemoveAction = removeAction.isAction
export const removeCodeOf = removeAction.keyOf

export const removeSpeciesActionFor = removeSpeciesAction.actionFor
export const isRemoveSpeciesAction = removeSpeciesAction.isAction
export const removeKeyOf = removeSpeciesAction.keyOf
