import { describe, expect, it } from 'vitest'

import {
  AMEND,
  DRAFT,
  SUBMITTED
} from '../../../../../engine/persistence/records.js'
import { marshal } from './document.js'

const document = (status) => ({
  referenceNumber: 'GBN-AG-26-DOC001',
  status,
  created: '2026-01-01T00:00:00',
  submittedAt: '2026-01-02T00:00:00',
  concurrencyToken: 3,
  fulfilments: []
})

describe('marshal document', () => {
  it('Should not expose a separate freeze field on the journey', () => {
    const journey = marshal(document('SUBMITTED'))
    expect(journey).not.toHaveProperty('frozenParties')
    expect(journey.status).toBe(SUBMITTED)
  })

  it('Should map draft and amend statuses without a freeze field', () => {
    expect(marshal(document('DRAFT')).status).toBe(DRAFT)
    expect(marshal(document('AMEND')).status).toBe(AMEND)
    expect(marshal(document('DRAFT'))).not.toHaveProperty('frozenParties')
  })
})
