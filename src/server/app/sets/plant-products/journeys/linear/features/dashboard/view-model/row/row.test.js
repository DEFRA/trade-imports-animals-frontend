import { describe, expect, it } from 'vitest'

import { hubPath, pagePath } from '../../../../../../../../shared/paths.js'
import { copy as sharedCopy } from '../../../../../../../../shared/copy.en.js'
import { copy } from '../../copy/copy.en.js'
import { toRow } from './index.js'

const journey = (overrides = {}) => ({
  journeyId: 'GBN-PP-26-ABC123',
  status: 'draft',
  originCountryCode: 'IE',
  arrivalDate: '2026-03-07',
  createdAt: '2026-03-01T12:00:00Z',
  submittedAt: null,
  ...overrides
})

describe('plant-products dashboard row view model', () => {
  it.each([
    ['draft', copy.statuses.draft, 'govuk-tag--grey'],
    ['submitted', copy.statuses.submitted, 'govuk-tag--blue'],
    ['amend', copy.statuses.amend, 'govuk-tag--yellow']
  ])('renders the shared %s vocabulary', (status, label, tagClass) => {
    expect(toRow(journey({ status })).status).toEqual({ label, tagClass })
  })

  it('resolves origin and formats every date consistently', () => {
    expect(
      toRow(journey({ submittedAt: '2026-03-08T09:00:00Z' }))
    ).toMatchObject({
      origin: 'Republic of Ireland',
      arrival: '7 March 2026',
      created: '1 March 2026',
      submitted: '8 March 2026'
    })
  })

  it('draft has one Continue-to-hub action', () => {
    expect(toRow(journey({ status: 'draft' })).actions).toEqual([
      {
        text: copy.actions.continue,
        hiddenText: 'notification GBN-PP-26-ABC123',
        href: hubPath('GBN-PP-26-ABC123')
      }
    ])
  })

  it.each(['submitted', 'amend'])(
    '%s has a Copy action with a fresh key',
    (status) => {
      const first = toRow(journey({ status }))
      const second = toRow(journey({ status }))
      const firstCopy = first.actions.find(
        ({ text }) => text === sharedCopy.notificationActions.copy.text
      )
      const secondCopy = second.actions.find(
        ({ text }) => text === sharedCopy.notificationActions.copy.text
      )

      expect(firstCopy).toEqual({
        text: sharedCopy.notificationActions.copy.text,
        hiddenText: 'notification GBN-PP-26-ABC123',
        postAction: pagePath('GBN-PP-26-ABC123', 'copy'),
        idempotencyKey: expect.any(String),
        copyOrigin: 'dashboard'
      })
      expect(secondCopy.idempotencyKey).not.toBe(firstCopy.idempotencyKey)
    }
  )

  it('reuses the recoverable retry key only for its matching row', () => {
    const retryCopy = {
      journeyId: 'GBN-PP-26-ABC123',
      idempotencyKey: 'same-retry-key'
    }
    const matching = toRow(journey({ status: 'submitted' }), retryCopy)
    const other = toRow(
      journey({ journeyId: 'GBN-PP-26-OTHER', status: 'submitted' }),
      retryCopy
    )

    expect(matching.actions[0].idempotencyKey).toBe('same-retry-key')
    expect(other.actions[0].idempotencyKey).not.toBe('same-retry-key')
  })

  it('unknown and missing facts degrade to blanks without throwing', () => {
    expect(toRow({ status: 'unknown' })).toEqual({
      reference: '',
      status: { label: '', tagClass: '' },
      origin: '',
      arrival: '',
      created: '',
      submitted: '',
      actions: []
    })
  })
})
