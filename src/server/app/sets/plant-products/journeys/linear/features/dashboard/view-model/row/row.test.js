import { describe, expect, it } from 'vitest'

import { hubPath } from '../../../../../../../../shared/paths.js'
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

  it.each(['draft', 'amend'])('%s has one Continue-to-hub action', (status) => {
    expect(toRow(journey({ status })).actions).toEqual([
      {
        text: copy.actions.continue,
        hiddenText: 'notification GBN-PP-26-ABC123',
        href: hubPath('GBN-PP-26-ABC123')
      }
    ])
  })

  it('submitted has no row actions', () => {
    expect(toRow(journey({ status: 'submitted' })).actions).toEqual([])
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
