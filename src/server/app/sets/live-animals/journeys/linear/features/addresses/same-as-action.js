import { actionsPrefixed } from '../commodities/action-prefix.js'

const SOURCE_PARTY_ID_BY_TARGET_ID = {
  consignor: 'placeOfOrigin',
  importer: 'consignee',
  placeOfDestination: 'consignee'
}

export const sourcePartyIdFor = (targetPartyId) =>
  SOURCE_PARTY_ID_BY_TARGET_ID[targetPartyId]

const sameAsAction = actionsPrefixed('same-as:')

export const sameAsActionFor = sameAsAction.actionFor

export const isSameAsAction = sameAsAction.isAction

export const sameAsTargetIdOf = sameAsAction.keyOf
