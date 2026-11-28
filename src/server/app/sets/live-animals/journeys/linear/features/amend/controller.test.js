import { SET_ID } from '../../../../set.js'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { dashboardPath, pagePath } from '../../../../../../shared/paths.js'
import {
  AMEND,
  configureRecords,
  DELETED,
  DRAFT,
  records,
  SUBMITTED
} from '../../../../../../engine/persistence/records.js'
import {
  actWithSessionOrganisation,
  journeyRequest,
  stubH,
  useStubbedJourney
} from '../../../../../../engine/test-support.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { dispatchPages } from '../index.js'
import { routes } from './controller.js'

const NOTIFICATION_VIEW_SLUG = 'notification-view'

const get = routes.find((route) => route.method === 'GET').handler
const post = routes.find((route) => route.method === 'POST').handler

const submittedJourney = async () => {
  const journey = await records.create()
  await records.submit(journey.journeyId, undefined, journey.concurrencyToken)
  return journey.journeyId
}

describe('amend routes', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  afterEach(() => {
    configureRecords(SET_ID, recordsStub)
    vi.unstubAllGlobals()
  })

  it('Should render the question as title and heading, with the go-back and Back links targeting the notification view, and leave the notification Submitted', async () => {
    const journeyId = await submittedJourney()

    const response = await get(journeyRequest(journeyId), stubH())

    expect(response.view).toBe(
      'live-animals/journeys/linear/features/amend/template'
    )
    expect(response.context).toMatchObject({
      pageTitle: 'Amend notification',
      heading: 'Amend notification',
      backLink: pagePath(journeyId, NOTIFICATION_VIEW_SLUG),
      confirmAction: pagePath(journeyId, 'amend'),
      goBackHref: pagePath(journeyId, NOTIFICATION_VIEW_SLUG)
    })
    expect(response.context.copy.question).toBe(
      'Are you sure you want to change this notification?'
    )
    expect((await records.load({ journeyId })).status).toBe(SUBMITTED)
  })

  it('Should start the amendment and redirect to the notification review carrying the dashboard trail', async () => {
    const journeyId = await submittedJourney()

    const response = await post(journeyRequest(journeyId), stubH())

    expect(response).toEqual({
      redirect: `${pagePath(journeyId, NOTIFICATION_VIEW_SLUG)}?from=dashboard`
    })
    expect((await records.load({ journeyId })).status).toBe(AMEND)
  })

  it('Should log the amendment started exactly once, with the journey id and the organisation id', async () => {
    const journeyId = await submittedJourney()
    const request = journeyRequest(journeyId)

    await post(request, stubH())

    expect(request.logger.entries).toEqual([
      {
        level: 'info',
        fields: { journeyId, organisationId: expect.any(String) },
        message: 'Amendment started'
      }
    ])
  })

  it('Should change nothing and open the notification list for a reference no record exists for', async () => {
    const unknown = 'GBN-AG-26-UNKNOWN'

    expect(await get(journeyRequest(unknown), stubH())).toEqual({
      redirect: dashboardPath()
    })
    expect(await post(journeyRequest(unknown), stubH())).toEqual({
      redirect: dashboardPath()
    })
  })

  it('Should change nothing and open the notification list for a deleted notification', async () => {
    const journey = await records.create()
    await records.softDelete(journey.journeyId)

    expect(await get(journeyRequest(journey.journeyId), stubH())).toEqual({
      redirect: dashboardPath()
    })
    expect(await post(journeyRequest(journey.journeyId), stubH())).toEqual({
      redirect: dashboardPath()
    })
    expect((await records.load({ journeyId: journey.journeyId })).status).toBe(
      DELETED
    )
  })

  it('Should change nothing and open the notification list for a draft', async () => {
    const journey = await records.create()

    expect(await get(journeyRequest(journey.journeyId), stubH())).toEqual({
      redirect: dashboardPath()
    })
    expect(await post(journeyRequest(journey.journeyId), stubH())).toEqual({
      redirect: dashboardPath()
    })
    expect((await records.load({ journeyId: journey.journeyId })).status).toBe(
      DRAFT
    )
  })

  it('Should change nothing and open the notification list for a notification already being amended', async () => {
    const journeyId = await submittedJourney()
    await records.amend(journeyId)

    expect(await get(journeyRequest(journeyId), stubH())).toEqual({
      redirect: dashboardPath()
    })
    expect(await post(journeyRequest(journeyId), stubH())).toEqual({
      redirect: dashboardPath()
    })
    expect((await records.load({ journeyId })).status).toBe(AMEND)
  })

  it('Should change nothing and open the notification list when the notification stops being amendable between the eligibility check and the write', async () => {
    const journeyId = await submittedJourney()
    let loadCount = 0
    configureRecords(SET_ID, {
      ...recordsStub,
      load: async (query) => {
        loadCount += 1
        const record = await recordsStub.load(query)
        return loadCount === 1 ? record : { ...record, status: AMEND }
      }
    })

    expect(await post(journeyRequest(journeyId), stubH())).toEqual({
      redirect: dashboardPath()
    })
  })

  it('Should re-render the confirmation at 500 with the recoverable-save banner after a backend failure', async () => {
    configureRecords(SET_ID, {
      ...recordsStub,
      amend: realRecords.amend
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      }))
    )
    const journeyId = await submittedJourney()

    const request = journeyRequest(journeyId)
    const response = await actWithSessionOrganisation(request, () =>
      post(request, stubH())
    )

    expect(response.statusCode).toBe(500)
    expect(response.context.recoverableError).toBe(true)
    expect(response.view).toBe(
      'live-animals/journeys/linear/features/amend/template'
    )
  })
})
