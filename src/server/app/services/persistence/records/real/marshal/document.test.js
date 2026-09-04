import { describe, expect, it } from 'vitest'

import {
  AMEND,
  DRAFT,
  SUBMITTED
} from '../../../../../engine/persistence/records.js'
import { marshal } from './document.js'

const freeze = {
  consignor: { name: 'Frozen Consignor', addressId: 'abc' }
}

const document = (status) => ({
  referenceNumber: 'GBN-AG-26-DOC001',
  status,
  created: '2026-01-01T00:00:00',
  submittedAt: '2026-01-02T00:00:00',
  concurrencyToken: 3,
  submittedNotificationBaseline: freeze,
  fulfilments: []
})

describe('marshal document', () => {
  it('Should read the freeze from submittedNotificationBaseline only when submitted', () => {
    expect(marshal(document('SUBMITTED')).frozenParties).toBe(freeze)
    expect(marshal(document('SUBMITTED')).status).toBe(SUBMITTED)
  })

  it('Should drop the freeze on a draft and on an in-flight amendment', () => {
    expect(marshal(document('DRAFT')).frozenParties).toBeNull()
    expect(marshal(document('DRAFT')).status).toBe(DRAFT)
    expect(marshal(document('AMEND')).frozenParties).toBeNull()
    expect(marshal(document('AMEND')).status).toBe(AMEND)
  })

  it('Should leave frozenParties null when a submitted document has no baseline', () => {
    expect(
      marshal({
        ...document('SUBMITTED'),
        submittedNotificationBaseline: null
      }).frozenParties
    ).toBeNull()
  })
})
