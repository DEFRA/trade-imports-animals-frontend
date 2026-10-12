import { describe, expect, it } from 'vitest'

import {
  AMEND,
  DRAFT,
  SUBMITTED,
  SUBMITTED_ACTION_REQUIRED
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

  it('Should carry answersChangedSinceSubmission only while amending', () => {
    const withSignal = (status, answersChangedSinceSubmission) =>
      marshal({ ...document(status), answersChangedSinceSubmission })

    expect(withSignal('AMEND', true).answersChangedSinceSubmission).toBe(true)
    expect(withSignal('AMEND', undefined).answersChangedSinceSubmission).toBe(
      false
    )
    expect(withSignal('SUBMITTED', true).answersChangedSinceSubmission).toBe(
      false
    )
  })

  it('Should map SUBMITTED_ACTION_REQUIRED, keeping its submittedAt and outstanding items', () => {
    const journey = marshal({
      ...document('SUBMITTED_ACTION_REQUIRED'),
      outstandingItems: ['HEALTH_CERTIFICATE']
    })

    expect(journey.status).toBe(SUBMITTED_ACTION_REQUIRED)
    expect(journey.submittedAt).toBe('2026-01-02T00:00:00')
    expect(journey.outstandingItems).toEqual(['HEALTH_CERTIFICATE'])
  })

  it('Should carry no outstanding items on a draft or an amendment', () => {
    for (const status of ['DRAFT', 'AMEND']) {
      expect(
        marshal({
          ...document(status),
          outstandingItems: ['HEALTH_CERTIFICATE']
        }).outstandingItems
      ).toEqual([])
    }
  })

  it('Should still throw on a status it does not know', () => {
    expect(() => marshal(document('SOMETHING_NEW'))).toThrow(
      /Unknown backend fulfilment status "SOMETHING_NEW"/
    )
  })

  it('Should map draft and amend statuses without a freeze field', () => {
    expect(marshal(document('DRAFT')).status).toBe(DRAFT)
    expect(marshal(document('AMEND')).status).toBe(AMEND)
    expect(marshal(document('DRAFT'))).not.toHaveProperty('frozenParties')
  })
})
