import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { pagePath } from '../../../../../../shared/paths.js'
import { buildDispatch } from '../../../../../../flow/dispatch.js'
import {
  configureRecords,
  DELETED,
  records
} from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { dispatchPages } from '../index.js'
import { routes } from './controller.js'

const get = routes.find((route) => route.method === 'GET').handler
const post = routes.find((route) => route.method === 'POST').handler

describe('delete notification routes', () => {
  beforeAll(() => {
    configureSession('live-animals', sessionStub)
    buildDispatch('live-animals', dispatchPages)
  })

  beforeEach(() => {
    configureRecords('live-animals', recordsStub)
    records.clear()
  })

  afterEach(() => {
    configureRecords('live-animals', recordsStub)
    vi.unstubAllGlobals()
  })

  it('Should render a journey-scoped irreversible confirmation', async () => {
    const journey = await records.create()

    const response = await get(journeyRequest(journey.journeyId), stubH())

    expect(response.view).toBe(
      'live-animals/journeys/linear/features/delete-notification/template'
    )
    expect(response.context).toMatchObject({
      heading: 'Delete this notification?',
      deleteAction: pagePath(journey.journeyId, 'delete'),
      noHref: '/live-animals'
    })
    expect(response.context.copy.body).toBe('This cannot be undone.')
  })

  it('Should soft-delete and redirect to the dashboard success banner', async () => {
    const journey = await records.create()

    const response = await post(journeyRequest(journey.journeyId), stubH())

    expect(response).toEqual({ redirect: '/live-animals?deleted=1' })
    expect((await records.load({ journeyId: journey.journeyId })).status).toBe(
      DELETED
    )
    expect(
      (await records.list({ journeyIds: [journey.journeyId] })).rows
    ).toEqual([])
  })

  it('Should handle an already-deleted journey without another transition', async () => {
    const journey = await records.create()
    await records.softDelete(journey.journeyId)

    expect(await get(journeyRequest(journey.journeyId), stubH())).toEqual({
      redirect: '/live-animals'
    })
    expect(await post(journeyRequest(journey.journeyId), stubH())).toEqual({
      redirect: '/live-animals'
    })
  })

  it('Should re-render confirmation at 500 with the recoverable-save banner after a backend failure', async () => {
    configureRecords('live-animals', {
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
    expect(response.view).toBe(
      'live-animals/journeys/linear/features/delete-notification/template'
    )
  })
})
