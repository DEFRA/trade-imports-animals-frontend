import { dashboardPath } from '../../../../../shared/paths.js'
import { SET_BASE, SET_ID } from '../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../flow/dispatch.js'
import { store } from '../../../../../engine/store.js'
import {
  AMEND,
  DELETED,
  DRAFT,
  SUBMITTED,
  SUBMITTED_ACTION_REQUIRED,
  configureRecords,
  records
} from '../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../services/persistence/session/stub.js'
import { stubH, journeyRequest } from '../../../../../engine/test-support.js'
import { dispatchPages } from './index.js'
import { base, journeyStrip } from '../../../../../shared/kit.js'
import { withTemplateMode } from '../../../../../shared/template-mode.js'

import { routes as hubRoutes } from './hub/controller.js'
import { routes as dashboardRoutes } from './dashboard/controller.js'
import { routes as originRoutes } from './origin/controller.js'
import { routes as importReasonRoutes } from './import-reason/controller.js'

const JOURNEY_REFERENCE = 'GBN-AG-26-ABC123'
const WEEKLY_CATTLE = 'Weekly cattle'
const TEMPLATE_ID = 'template-1'
const DRAFT_TAG = { text: 'Draft', classes: 'govuk-tag--blue' }
const DASHBOARD_PATH = dashboardPath()

const getHandlerOf = (routes) =>
  routes.find((route) => route.method === 'GET').handler

const renderWith = async (handler, seed) => {
  const journey = await store.create()
  if (seed) {
    await store.seedAnswers(journey.journeyId, seed)
  }
  const h = stubH()
  await handler(journeyRequest(journey.journeyId), h)
  return { journey, context: h.captured.view.context }
}

describe('journey reference strip', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should map a draft journey to a blue Draft tag with the reference', () => {
    expect(
      journeyStrip({ journeyId: JOURNEY_REFERENCE, status: DRAFT })
    ).toEqual({
      reference: JOURNEY_REFERENCE,
      status: DRAFT_TAG
    })
  })

  it('Should map a submitted journey to a green Submitted tag', () => {
    expect(
      journeyStrip({ journeyId: JOURNEY_REFERENCE, status: SUBMITTED })
    ).toEqual({
      reference: JOURNEY_REFERENCE,
      status: { text: 'Submitted', classes: 'govuk-tag--green' }
    })
  })

  it("Should tag a notification submitted with action required 'Submitted action required' in orange", () => {
    expect(
      journeyStrip({
        journeyId: JOURNEY_REFERENCE,
        status: SUBMITTED_ACTION_REQUIRED
      })
    ).toEqual({
      reference: JOURNEY_REFERENCE,
      status: {
        text: 'Submitted action required',
        classes: 'govuk-tag--orange'
      }
    })
  })

  it('Should map an amend journey to a yellow Amend tag with Cancel amend', () => {
    expect(
      journeyStrip({ journeyId: JOURNEY_REFERENCE, status: AMEND })
    ).toEqual({
      reference: JOURNEY_REFERENCE,
      status: { text: 'Amend', classes: 'govuk-tag--yellow' },
      cancelAmend: {
        href: `${SET_BASE}/notifications/${JOURNEY_REFERENCE}/cancel-amend`,
        text: 'Cancel amend'
      }
    })
  })

  it('Should offer no Cancel amend on a draft, submitted or deleted journey', () => {
    for (const status of [DRAFT, SUBMITTED, DELETED]) {
      expect(
        journeyStrip({ journeyId: JOURNEY_REFERENCE, status }).cancelAmend
      ).toBeUndefined()
    }
  })

  it('Should withhold Cancel amend when told to', () => {
    expect(
      journeyStrip(
        { journeyId: JOURNEY_REFERENCE, status: AMEND },
        { offerCancelAmend: false }
      ).cancelAmend
    ).toBeUndefined()
  })

  it('Should offer Cancel amend on the hub while amending', async () => {
    const journey = await store.create()
    await store.submit(journey.journeyId)
    await records.amend(journey.journeyId)
    const h = stubH()
    await getHandlerOf(hubRoutes)(journeyRequest(journey.journeyId), h)
    expect(h.captured.view.context.journeyStrip.cancelAmend.href).toMatch(
      /\/cancel-amend$/
    )
  })

  it('Should map a deleted journey to a grey Deleted tag', () => {
    expect(
      journeyStrip({ journeyId: JOURNEY_REFERENCE, status: DELETED })
    ).toEqual({
      reference: JOURNEY_REFERENCE,
      status: { text: 'Deleted', classes: 'govuk-tag--grey' }
    })
  })

  it('Should map no journey to null', () => {
    expect(journeyStrip(undefined)).toBeNull()
  })

  it('Should render the strip on the hub with the journey reference', async () => {
    const { journey, context } = await renderWith(getHandlerOf(hubRoutes))
    expect(context.journeyStrip).toEqual({
      reference: journey.journeyId,
      status: DRAFT_TAG
    })
  })

  it('Should render the strip on a post-origin task page', async () => {
    const { journey, context } = await renderWith(
      getHandlerOf(importReasonRoutes)
    )
    expect(context.journeyStrip).toEqual({
      reference: journey.journeyId,
      status: DRAFT_TAG
    })
  })

  it('Should render no strip on the dashboard', async () => {
    const { context } = await renderWith(getHandlerOf(dashboardRoutes))
    expect(context.journeyStrip).toBeUndefined()
  })

  // The reference is minted when the notification is created, so origin can
  // show it on the very first request — before the user has saved anything.
  it('Should render the strip on origin while the journey has no saved answers', async () => {
    const { journey, context } = await renderWith(getHandlerOf(originRoutes))
    expect(context.journeyStrip).toEqual({
      reference: journey.journeyId,
      status: DRAFT_TAG
    })
  })

  // Real mode rebuilds `answers` from the stored notification, so a fresh
  // backend DRAFT loads carrying its server-minted referenceNumber. The strip
  // is drawn either way; the back link is the one thing still told by saved
  // answers, and the backend's own field is not one — so it stays on the
  // dashboard rather than the hub.
  it('Should render the strip but keep the dashboard back link for a real-mode fresh draft carrying only the backend reference', async () => {
    const { journey, context } = await renderWith(getHandlerOf(originRoutes), {
      referenceNumber: 'GBN-AG-26-29Q5Q7'
    })
    expect(context.journeyStrip).toEqual({
      reference: journey.journeyId,
      status: DRAFT_TAG
    })
    expect(context.backLink).toBe(DASHBOARD_PATH)
  })

  it('Should render the strip on origin once the journey has saved answers', async () => {
    const { journey, context } = await renderWith(getHandlerOf(originRoutes), {
      countryOfOrigin: 'FR'
    })
    expect(context.journeyStrip).toEqual({
      reference: journey.journeyId,
      status: DRAFT_TAG
    })
  })
})

describe('journey strip in template mode', () => {
  const TEMPLATE_TAG = { text: 'Template', classes: 'govuk-tag--grey' }

  it('Should draw a grey Template tag with the template name where a notification shows its reference', () => {
    const strip = withTemplateMode('2100010101', () =>
      journeyStrip({
        journeyId: TEMPLATE_ID,
        status: DRAFT,
        templateName: WEEKLY_CATTLE
      })
    )

    expect(strip).toEqual({ reference: WEEKLY_CATTLE, status: TEMPLATE_TAG })
  })

  it('Should draw the tag with no name for a template with a blank name', () => {
    const strip = withTemplateMode('2100010101', () =>
      journeyStrip({ journeyId: TEMPLATE_ID, status: DRAFT, templateName: '' })
    )

    expect(strip).toEqual({ reference: '', status: TEMPLATE_TAG })
  })

  it("Should link a template page to the template's own task list", () => {
    const view = withTemplateMode('2100010101', () =>
      base('Origin', { journey: { journeyId: TEMPLATE_ID, status: DRAFT } })
    )

    expect(view.hubHref).toBe(`/live-animals/templates/${TEMPLATE_ID}`)
  })

  it('Should still give a notification page its overview link', () => {
    const view = base('Origin', {
      journey: { journeyId: JOURNEY_REFERENCE, status: DRAFT }
    })

    expect(view.hubHref).toBe(
      `/live-animals/notifications/${JOURNEY_REFERENCE}`
    )
  })
})
