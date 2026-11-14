import { describe, expect, it } from 'vitest'

import {
  SUBMITTED,
  SUBMITTED_ACTION_REQUIRED
} from '../../../../../../../engine/index.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { deleteButtonFor, submittedHeader } from './submitted-header.js'

const LATE_EVENING_INSTANT = '2026-07-21T23:30:00Z'
const REFERENCE = 'GBN-2026-0001-0001'

const submittedJourney = (overrides = {}) => ({
  journeyId: REFERENCE,
  status: SUBMITTED,
  submittedAt: LATE_EVENING_INSTANT,
  ...overrides
})

describe('#submittedHeader', () => {
  it('Should name the notification by its reference with a green Submitted tag', () => {
    const header = submittedHeader(submittedJourney())

    expect(header.reference).toBe(REFERENCE)
    expect(header.status).toEqual({
      text: 'Submitted',
      classes: 'govuk-tag--green'
    })
  })

  it('Should carry the warning to upload a health certificate and an orange tag when the status is Submitted action required', () => {
    const header = submittedHeader(
      submittedJourney({ status: SUBMITTED_ACTION_REQUIRED })
    )

    expect(header.status).toEqual({
      text: 'Submitted action required',
      classes: 'govuk-tag--orange'
    })
    expect(header.actionRequiredWarning).toEqual({
      text: 'You need to upload a health certificate',
      iconFallbackText: 'Warning'
    })
  })

  it('Should carry no warning when the status is Submitted', () => {
    expect(submittedHeader(submittedJourney()).actionRequiredWarning).toBeNull()
  })

  it('Should date the notification on the London day it was submitted, with the month in full', () => {
    expect(submittedHeader(submittedJourney()).dateSubmitted).toBe(
      'Date submitted: 22 July 2026'
    )
  })

  it('Should date a late-evening British Summer Time submission on the next London day', () => {
    expect(
      submittedHeader(submittedJourney({ submittedAt: '2026-07-11T23:30:00Z' }))
        .dateSubmitted
    ).toBe('Date submitted: 12 July 2026')
  })

  it('Should show no date line when the journey has no stored submission instant', () => {
    expect(
      submittedHeader(submittedJourney({ submittedAt: null })).dateSubmitted
    ).toBeNull()
  })

  it('Should point Amend and Copy as new at the notification actions and Delete at its delete page', () => {
    expect(submittedHeader(submittedJourney()).actions).toEqual({
      amend: {
        text: 'Amend this notification',
        formAction: pagePath(REFERENCE, 'amend')
      },
      copy: {
        text: 'Copy as new',
        formAction: pagePath(REFERENCE, 'copy')
      },
      delete: {
        text: 'Delete',
        href: pagePath(REFERENCE, 'delete'),
        classes: 'govuk-button--warning'
      }
    })
  })

  it('Should show the notification reference and the customs document code as import reference numbers', () => {
    expect(submittedHeader(submittedJourney()).importReferences).toEqual({
      heading: 'Import reference numbers',
      warning: {
        text: 'You must use the correct reference and code on the customs declaration or your consignment will be delayed.',
        iconFallbackText: 'Warning'
      },
      rows: [
        {
          key: { text: 'Notification reference' },
          value: { text: REFERENCE }
        },
        { key: { text: 'Customs document code' }, value: { text: 'C640' } }
      ]
    })
  })
})

describe('#deleteButtonFor', () => {
  it('Should be a warning button to the notification delete page', () => {
    expect(deleteButtonFor(submittedJourney())).toEqual({
      text: 'Delete',
      href: pagePath(REFERENCE, 'delete'),
      classes: 'govuk-button--warning'
    })
  })
})
