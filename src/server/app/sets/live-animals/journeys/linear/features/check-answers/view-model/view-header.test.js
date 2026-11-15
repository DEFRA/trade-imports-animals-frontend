import { describe, expect, it } from 'vitest'

import {
  AMEND,
  DRAFT,
  SUBMITTED,
  SUBMITTED_ACTION_REQUIRED
} from '../../../../../../../engine/index.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { deleteButtonFor, viewHeader } from './view-header.js'

const LATE_EVENING_INSTANT = '2026-07-21T23:30:00Z'
const REFERENCE = 'GBN-2026-0001-0001'
const DELETE_BUTTON = {
  text: 'Delete',
  href: pagePath(REFERENCE, 'delete'),
  classes: 'govuk-button--warning'
}

const submittedJourney = (overrides = {}) => ({
  journeyId: REFERENCE,
  status: SUBMITTED,
  submittedAt: LATE_EVENING_INSTANT,
  ...overrides
})

describe('#viewHeader', () => {
  it('Should name the notification by its reference with a green Submitted tag', () => {
    const header = viewHeader(submittedJourney())

    expect(header.reference).toBe(REFERENCE)
    expect(header.status).toEqual({
      text: 'Submitted',
      classes: 'govuk-tag--green'
    })
  })

  it('Should carry the warning to upload a health certificate and an orange tag when the status is Submitted action required', () => {
    const header = viewHeader(
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
    expect(viewHeader(submittedJourney()).actionRequiredWarning).toBeNull()
  })

  it('Should date the notification on the London day it was submitted, with the month in full', () => {
    expect(viewHeader(submittedJourney()).dateLine).toBe(
      'Date submitted: 22 July 2026'
    )
  })

  it('Should date a late-evening British Summer Time submission on the next London day', () => {
    expect(
      viewHeader(submittedJourney({ submittedAt: '2026-07-11T23:30:00Z' }))
        .dateLine
    ).toBe('Date submitted: 12 July 2026')
  })

  it('Should show no date line when the journey has no stored submission instant', () => {
    expect(
      viewHeader(submittedJourney({ submittedAt: null })).dateLine
    ).toBeNull()
  })

  it('Should point Amend and Copy as new at the notification actions and Delete at its delete page', () => {
    expect(viewHeader(submittedJourney()).actions).toEqual({
      amend: {
        text: 'Amend this notification',
        formAction: pagePath(REFERENCE, 'amend')
      },
      copy: {
        text: 'Copy as new',
        formAction: pagePath(REFERENCE, 'copy'),
        classes: 'govuk-button--secondary'
      },
      delete: DELETE_BUTTON
    })
  })

  it('Should show the notification reference and the customs document code as import reference numbers', () => {
    expect(viewHeader(submittedJourney()).importReferences).toEqual({
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

describe('#viewHeader for a draft', () => {
  const CREATED_AT = '2026-07-21T23:30:00Z'

  const draftJourney = (overrides = {}) => ({
    journeyId: REFERENCE,
    status: DRAFT,
    createdAt: CREATED_AT,
    ...overrides
  })

  it('Should name the notification by its reference with a blue Draft tag', () => {
    const header = viewHeader(draftJourney())

    expect(header.reference).toBe(REFERENCE)
    expect(header.status).toEqual({ text: 'Draft', classes: 'govuk-tag--blue' })
  })

  it('Should date a late-evening British Summer Time creation on the next London day', () => {
    expect(viewHeader(draftJourney()).dateLine).toBe(
      'Date created: 22 July 2026'
    )
  })

  it('Should show no date line when the journey has no stored creation instant', () => {
    expect(viewHeader(draftJourney({ createdAt: null })).dateLine).toBeNull()
  })

  it('Should offer a primary Copy as new and Delete, and no Amend', () => {
    expect(viewHeader(draftJourney()).actions).toEqual({
      amend: null,
      copy: {
        text: 'Copy as new',
        formAction: pagePath(REFERENCE, 'copy'),
        classes: ''
      },
      delete: DELETE_BUTTON
    })
  })

  it("Should show a draft's reference and the customs document code as import reference numbers", () => {
    expect(
      viewHeader(draftJourney()).importReferences.rows.map(
        (row) => row.value.text
      )
    ).toEqual([REFERENCE, 'C640'])
  })

  it('Should carry no action-required warning', () => {
    expect(viewHeader(draftJourney()).actionRequiredWarning).toBeNull()
  })
})

describe('#viewHeader for an amendment', () => {
  it('Should give no header', () => {
    expect(viewHeader({ journeyId: REFERENCE, status: AMEND })).toBeNull()
  })
})

describe('#deleteButtonFor', () => {
  it('Should be a warning button to the notification delete page', () => {
    expect(deleteButtonFor(submittedJourney())).toEqual(DELETE_BUTTON)
  })
})
