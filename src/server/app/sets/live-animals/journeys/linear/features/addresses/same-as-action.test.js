import { describe, expect, it } from 'vitest'

import {
  isSameAsAction,
  sameAsActionFor,
  sameAsTargetIdOf,
  sourcePartyIdFor
} from './same-as-action.js'

describe('#sourcePartyIdFor', () => {
  it('Should give the consignor, importer and place of destination a source party and no other party one', () => {
    expect(sourcePartyIdFor('consignor')).toBe('placeOfOrigin')
    expect(sourcePartyIdFor('importer')).toBe('consignee')
    expect(sourcePartyIdFor('placeOfDestination')).toBe('consignee')
    expect(sourcePartyIdFor('placeOfOrigin')).toBeUndefined()
    expect(sourcePartyIdFor('consignee')).toBeUndefined()
    expect(sourcePartyIdFor('cph')).toBeUndefined()
  })
})

describe('#sameAsActionFor and #sameAsTargetIdOf', () => {
  it('Should round-trip the target party id a same-as button posts', () => {
    expect(sameAsTargetIdOf(sameAsActionFor('consignor'))).toBe('consignor')
    expect(sameAsTargetIdOf(sameAsActionFor('placeOfDestination'))).toBe(
      'placeOfDestination'
    )
  })
})

describe('#isSameAsAction', () => {
  it('Should recognise a same-as action and not an action of another shape', () => {
    expect(isSameAsAction(sameAsActionFor('consignor'))).toBe(true)
    expect(isSameAsAction('add')).toBe(false)
    expect(isSameAsAction('remove:FR')).toBe(false)
  })
})
