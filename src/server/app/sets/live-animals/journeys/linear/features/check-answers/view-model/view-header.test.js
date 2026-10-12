import { describe, expect, it } from 'vitest'

import {
  DRAFT,
  SUBMITTED,
  SUBMITTED_ACTION_REQUIRED
} from '../../../../../../../engine/index.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { viewHeaderOf } from './view-header.js'

const journeyId = 'GBN-AG-26-ABC123'
const CREATED_AT = '2026-07-21T23:30:00Z'

describe('#viewHeaderOf', () => {
  it('Should offer Amend this notification beside a secondary Copy as new, and Delete, for a submitted notification', () => {
    const { actions } = viewHeaderOf({
      journeyId,
      status: SUBMITTED,
      submittedAt: null
    })

    expect(actions).toEqual({
      amendHref: pagePath(journeyId, 'amend'),
      copyHref: pagePath(journeyId, 'copy'),
      copyIsPrimary: false,
      deleteHref: pagePath(journeyId, 'delete')
    })
  })

  it('Should give a submitted notification no warning and no Continue', () => {
    const header = viewHeaderOf({
      journeyId,
      status: SUBMITTED,
      submittedAt: null
    })

    expect(header.warning).toBeNull()
    expect(header.continueHref).toBeNull()
  })

  it('Should warn and offer Continue to amend on a notification owed only its health certificate', () => {
    const header = viewHeaderOf({
      journeyId,
      status: SUBMITTED_ACTION_REQUIRED,
      outstandingItems: ['HEALTH_CERTIFICATE'],
      submittedAt: null
    })

    expect(header.warning).toBe('You need to upload a health certificate')
    expect(header.continueHref).toBe(pagePath(journeyId, 'amend'))
  })

  it('Should give no warning on an action-required notification owed something other than the health certificate alone', () => {
    const header = viewHeaderOf({
      journeyId,
      status: SUBMITTED_ACTION_REQUIRED,
      outstandingItems: ['HEALTH_CERTIFICATE', 'OTHER'],
      submittedAt: null
    })

    expect(header.warning).toBeNull()
    expect(header.continueHref).toBe(pagePath(journeyId, 'amend'))
  })

  it('Should offer Amend this notification on an action-required notification', () => {
    const { actions } = viewHeaderOf({
      journeyId,
      status: SUBMITTED_ACTION_REQUIRED,
      outstandingItems: ['HEALTH_CERTIFICATE'],
      submittedAt: null
    })

    expect(actions.amendHref).toBe(pagePath(journeyId, 'amend'))
    expect(actions.copyIsPrimary).toBe(false)
  })

  it('Should make Copy as new the primary action when the notification cannot be amended', () => {
    const { actions } = viewHeaderOf({
      journeyId,
      status: DRAFT,
      submittedAt: null
    })

    expect(actions.amendHref).toBeNull()
    expect(actions.copyIsPrimary).toBe(true)
  })

  it("Should date a draft's header with the day it was created, and give no date submitted", () => {
    const header = viewHeaderOf({
      journeyId,
      status: DRAFT,
      createdAt: CREATED_AT,
      submittedAt: null
    })

    expect(header.dateCreated).toBe('Date created: 22 July 2026')
    expect(header.dateSubmitted).toBeNull()
  })

  it('Should show no Date created line for a draft with no created date', () => {
    const header = viewHeaderOf({
      journeyId,
      status: DRAFT,
      createdAt: null,
      submittedAt: null
    })

    expect(header.dateCreated).toBeNull()
    expect(header.dateSubmitted).toBeNull()
  })

  it('Should give a submitted header no date created', () => {
    const header = viewHeaderOf({
      journeyId,
      status: SUBMITTED,
      createdAt: CREATED_AT,
      submittedAt: '2026-07-22T10:00:00Z'
    })

    expect(header.dateCreated).toBeNull()
    expect(header.dateSubmitted).toBe('Date submitted: 22 July 2026')
  })

  it("Should give a draft's header no warning and no Continue", () => {
    const header = viewHeaderOf({
      journeyId,
      status: DRAFT,
      createdAt: CREATED_AT,
      submittedAt: null
    })

    expect(header.warning).toBeNull()
    expect(header.continueHref).toBeNull()
  })

  it('Should give the import reference numbers as the notification reference and customs document code C640', () => {
    const { importReferences } = viewHeaderOf({
      journeyId,
      status: SUBMITTED,
      submittedAt: null
    })

    expect(importReferences).toEqual([
      {
        key: { text: 'Notification reference' },
        value: { text: journeyId }
      },
      {
        key: { text: 'Customs document code' },
        value: { text: 'C640' }
      }
    ])
  })
})
