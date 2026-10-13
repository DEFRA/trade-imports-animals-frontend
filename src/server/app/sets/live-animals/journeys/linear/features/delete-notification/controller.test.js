import { SET_ID } from '../../../../set.js'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { dashboardPath, pagePath } from '../../../../../../shared/paths.js'
import { assembleFulfilments } from '../../../../../../bridge/assemble-fulfilments.js'
import { buildDispatch } from '../../../../../../flow/dispatch.js'
import {
  configureRecords,
  DELETED,
  records,
  SUBMITTED,
  SUBMITTED_ACTION_REQUIRED
} from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { dispatchPages } from '../index.js'
import { routes } from './controller.js'

const DELETE_VIEW =
  'live-animals/journeys/linear/features/delete-notification/template'

const get = routes.find((route) => route.method === 'GET').handler
const post = routes.find((route) => route.method === 'POST').handler

describe('delete notification routes', () => {
  beforeAll(() => {
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })

  beforeEach(() => {
    configureRecords(SET_ID, recordsStub)
    records.clear()
  })

  afterEach(() => {
    configureRecords(SET_ID, recordsStub)
    vi.unstubAllGlobals()
  })

  it('Should render a journey-scoped irreversible confirmation', async () => {
    const journey = await records.create()

    const response = await get(journeyRequest(journey.journeyId), stubH())

    expect(response.view).toBe(DELETE_VIEW)
    expect(response.context).toMatchObject({
      heading: 'Delete this notification?',
      deleteAction: pagePath(journey.journeyId, 'delete'),
      noHref: dashboardPath()
    })
    expect(response.context.copy.body).toBe('This cannot be undone.')
  })

  it('Should soft-delete and redirect to the dashboard success banner', async () => {
    const journey = await records.create()

    const response = await post(journeyRequest(journey.journeyId), stubH())

    expect(response).toEqual({ redirect: `${dashboardPath()}?deleted=1` })
    expect((await records.load({ journeyId: journey.journeyId })).status).toBe(
      DELETED
    )
    expect(
      (await records.list({ journeyIds: [journey.journeyId] })).rows
    ).toEqual([])
  })

  describe.each([
    ['Submitted action required', undefined, SUBMITTED_ACTION_REQUIRED],
    ['Submitted', 'ITAHC', SUBMITTED]
  ])('a %s notification', (_label, documentType, expectedStatus) => {
    const finalised = async () => {
      const journey = await records.create()
      await records.replaceFulfilment(
        journey.journeyId,
        assembleFulfilments({
          countryOfOrigin: 'FR',
          documents: documentType
            ? [
                {
                  accompanyingDocumentType: documentType,
                  accompanyingDocumentAttachmentType: 'PDF',
                  accompanyingDocumentReference: 'GBHC1234567890',
                  accompanyingDocumentDateOfIssue: {
                    day: '12',
                    month: '12',
                    year: '2025'
                  },
                  filename: 'health-certificate.pdf'
                }
              ]
            : []
        })
      )
      await records.finalise(
        journey.journeyId,
        undefined,
        (await records.load({ journeyId: journey.journeyId })).concurrencyToken
      )
      return journey.journeyId
    }

    it('Should render the delete confirmation rather than redirect away', async () => {
      const journeyId = await finalised()
      expect((await records.load({ journeyId })).status).toBe(expectedStatus)

      const response = await get(journeyRequest(journeyId), stubH())

      expect(response.view).toBe(DELETE_VIEW)
      expect(response.context.deleteAction).toBe(pagePath(journeyId, 'delete'))
    })

    it('Should soft-delete and redirect to the dashboard success banner', async () => {
      const journeyId = await finalised()

      const response = await post(journeyRequest(journeyId), stubH())

      expect(response).toEqual({ redirect: `${dashboardPath()}?deleted=1` })
      expect((await records.load({ journeyId })).status).toBe(DELETED)
    })
  })

  it('Should handle an already-deleted journey without another transition', async () => {
    const journey = await records.create()
    await records.softDelete(journey.journeyId)

    expect(await get(journeyRequest(journey.journeyId), stubH())).toEqual({
      redirect: dashboardPath()
    })
    expect(await post(journeyRequest(journey.journeyId), stubH())).toEqual({
      redirect: dashboardPath()
    })
  })

  it('Should re-render confirmation at 500 with the recoverable-save banner after a backend failure', async () => {
    configureRecords(SET_ID, {
      ...recordsStub,
      softDelete: realRecords.softDelete
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      }))
    )
    const journey = await records.create()

    const response = await post(journeyRequest(journey.journeyId), stubH())

    expect(response.statusCode).toBe(500)
    expect(response.context.recoverableError).toBe(true)
    expect(response.view).toBe(DELETE_VIEW)
  })
})
