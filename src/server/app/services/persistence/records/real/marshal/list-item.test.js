import { describe, expect, test } from 'vitest'
import { marshalListItem } from './list-item.js'

describe('marshalListItem — commodity label', () => {
  test('Should use commodities from the list API row when present', () => {
    const row = marshalListItem({
      referenceNumber: 'GBN-AG-26-ABC',
      status: 'SUBMITTED',
      commodities: [{ name: 'Cow' }, { name: 'Cat' }]
    })
    expect(row.commodity).toEqual({ name: 'Cow, Cat' })
  })

  test('Should fall back to legacy commodity on the list API row', () => {
    const row = marshalListItem({
      referenceNumber: 'GBN-AG-26-LEG',
      status: 'SUBMITTED',
      commodity: { name: 'Cow' }
    })
    expect(row.commodity).toEqual({ name: 'Cow' })
  })
})
