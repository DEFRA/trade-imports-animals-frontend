import { describe, expect, test } from 'vitest'
import { marshalListItem } from './list-item.js'

describe('marshalListItem — commodity label', () => {
  test('Should join the commodities[] names into one commodity label', () => {
    const row = marshalListItem({
      referenceNumber: 'GBN-AG-26-ABC',
      status: 'SUBMITTED',
      commodities: [{ name: 'Cow' }, { name: 'Cat' }]
    })
    expect(row.commodity).toEqual({ name: 'Cow, Cat' })
  })

  test('Should use the single commodity field when commodities[] is absent', () => {
    const row = marshalListItem({
      referenceNumber: 'GBN-AG-26-LEG',
      status: 'SUBMITTED',
      commodity: { name: 'Cow' }
    })
    expect(row.commodity).toEqual({ name: 'Cow' })
  })
})
