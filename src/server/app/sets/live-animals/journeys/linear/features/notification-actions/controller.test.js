import { SET_ID } from '../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

import { dashboardPath, hubPath } from '../../../../../../shared/paths.js'
import { buildDispatch } from '../../../../../../flow/dispatch.js'
import {
  configureRecords,
  records
} from '../../../../../../engine/persistence/records.js'
import {
  configureSession,
  knownJourneysCookie
} from '../../../../../../engine/persistence/session.js'
import {
  backendJourneyId,
  backendNotification,
  journeyRequest,
  stubH
} from '../../../../../../engine/test-support.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as recordsReal } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { dispatchPages } from '../index.js'
import { routes } from './controller.js'

const copyPost = routes[0].handler

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const copyPayload = { concurrencyToken: '0', copyOrigin: 'dashboard' }

const emptyNotificationList = JSON.stringify({
  page: 1,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  content: []
})

const backendAnsweringCopyWith = (copyResponse) =>
  fetchMocker.mockResponse(async (request) => {
    if (request.url.includes('/copy')) {
      return copyResponse()
    }
    return {
      body: request.url.endsWith('/fulfilments')
        ? backendNotification({
            status: 'SUBMITTED',
            submittedAt: '2026-07-23T10:00:00Z'
          })
        : emptyNotificationList
    }
  })

describe('copy notification action', () => {
  beforeAll(() => {
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })

  describe('against the stub store', () => {
    beforeEach(() => {
      configureRecords(SET_ID, recordsStub)
      records.clear()
    })

    it('Should copy into a known new draft and redirect to its journey-scoped hub', async () => {
      const source = await records.create()

      const response = await copyPost(
        journeyRequest(source.journeyId, { payload: copyPayload }),
        stubH()
      )

      expect(response.redirect).toMatch(/\/notifications\/[^/]+$/)
      const copiedJourneyId = response.redirect.split('/').at(-1)
      expect(response.redirect).toBe(hubPath(copiedJourneyId))
      expect(copiedJourneyId).not.toBe(source.journeyId)
      expect(await records.load({ journeyId: copiedJourneyId })).toMatchObject({
        status: 'draft'
      })
    })

    it('Should copy a source the session has not opened into a new draft at its hub', async () => {
      const source = await records.create()
      await records.finalise(
        source.journeyId,
        undefined,
        source.concurrencyToken
      )
      const h = stubH()

      const response = await copyPost(
        journeyRequest(source.journeyId, {
          payload: copyPayload,
          knownJourneyIds: []
        }),
        h
      )

      const [copiedJourneyId] = h.cookies[knownJourneysCookie()]
      expect(response.redirect).toBe(hubPath(copiedJourneyId))
      expect(copiedJourneyId).not.toBe(source.journeyId)
      expect(await records.load({ journeyId: copiedJourneyId })).toMatchObject({
        status: 'draft'
      })
      expect(await records.load({ journeyId: source.journeyId })).toMatchObject(
        { status: 'submitted' }
      )
    })

    it('Should redirect a source the store does not hold to the dashboard and register no copy', async () => {
      const unknownJourneyId = 'GBN-AG-26-UNKNOWN'
      const h = stubH()

      const response = await copyPost(
        journeyRequest(unknownJourneyId, {
          payload: copyPayload,
          knownJourneyIds: []
        }),
        h
      )

      expect(response.redirect).toBe(dashboardPath())
      expect(await records.has(unknownJourneyId)).toBe(false)
      expect(h.cookies).toEqual({})
    })
  })

  describe('against the backend', () => {
    beforeEach(() => {
      configureRecords(SET_ID, recordsReal)
      fetchMocker.resetMocks()
    })

    it('Should re-render the dashboard at 500 after a recoverable backend failure', async () => {
      backendAnsweringCopyWith(() => ({
        body: 'Unavailable',
        status: 503,
        statusText: 'Service Unavailable'
      }))

      const response = await copyPost(
        journeyRequest(backendJourneyId, { payload: copyPayload }),
        stubH()
      )

      expect(response.statusCode).toBe(500)
      expect(response.view).toBe(
        'live-animals/journeys/linear/features/dashboard/template'
      )
      expect(response.context.recoverableError).toBe(true)
    })

    it('Should redirect to the dashboard with ?staleAction=1 on 409 STALE_CONCURRENCY_TOKEN from copy', async () => {
      backendAnsweringCopyWith(() => ({
        body: JSON.stringify({ code: 'STALE_CONCURRENCY_TOKEN' }),
        status: 409
      }))

      const response = await copyPost(
        journeyRequest(backendJourneyId, { payload: copyPayload }),
        stubH()
      )

      expect(response.redirect).toBe(`${dashboardPath()}?staleAction=1`)
    })

    it('Should propagate a network failure that is not a backend response', async () => {
      backendAnsweringCopyWith(() => {
        throw new TypeError('network down')
      })

      await expect(
        copyPost(
          journeyRequest(backendJourneyId, { payload: copyPayload }),
          stubH()
        )
      ).rejects.toThrow('network down')
    })
  })
})
