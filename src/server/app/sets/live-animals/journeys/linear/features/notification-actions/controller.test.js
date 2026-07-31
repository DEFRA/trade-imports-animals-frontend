import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { hubPath } from '../../../../../../shared/paths.js'
import { buildDispatch } from '../../../../../../flow/dispatch.js'
import {
  configureRecords,
  records
} from '../../../../../../engine/persistence/records.js'
import {
  configureSession,
  KNOWN_JOURNEYS_COOKIE
} from '../../../../../../engine/persistence/session.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { dispatchPages } from '../index.js'
import { routes } from './controller.js'

const copyPost = routes[0].handler

describe('copy notification action', () => {
  beforeAll(() => {
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })

  beforeEach(() => {
    configureRecords(recordsStub)
    records.clear()
  })

  afterEach(() => {
    configureRecords(recordsStub)
    vi.unstubAllGlobals()
  })

  it('Should copy into a known new draft and redirect to its journey-scoped hub', async () => {
    const source = await records.create()
    const h = stubH()

    const response = await copyPost(
      journeyRequest(source.journeyId, {
        payload: {
          idempotencyKey: 'copy-key-123',
          copyOrigin: 'dashboard'
        }
      }),
      h
    )

    expect(response.redirect).toMatch(/\/notifications\/[^/]+$/)
    const copiedJourneyId = response.redirect.split('/').at(-1)
    expect(response.redirect).toBe(hubPath(copiedJourneyId))
    expect(copiedJourneyId).not.toBe(source.journeyId)
    expect(await records.load({ journeyId: copiedJourneyId })).toMatchObject({
      status: 'draft'
    })
  })

  it('Should make a retry redirect stable for the same idempotency key', async () => {
    const source = await records.create()
    const request = () =>
      journeyRequest(source.journeyId, {
        payload: {
          idempotencyKey: 'stable-copy-key',
          copyOrigin: 'dashboard'
        },
        state: { [KNOWN_JOURNEYS_COOKIE]: [source.journeyId] }
      })

    const first = await copyPost(request(), stubH())
    const retry = await copyPost(request(), stubH())

    expect(retry.redirect).toBe(first.redirect)
  })

  it('Should re-render the dashboard at 500 with the same key after a recoverable backend failure', async () => {
    configureRecords({ ...recordsStub, copy: realRecords.copy })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      }))
    )
    const source = await records.create()

    const response = await copyPost(
      journeyRequest(source.journeyId, {
        payload: {
          idempotencyKey: 'retry-this-key',
          copyOrigin: 'dashboard'
        }
      }),
      stubH()
    )

    expect(response.statusCode).toBe(500)
    expect(response.view).toBe(
      'live-animals/journeys/linear/features/dashboard/template'
    )
    expect(response.context.recoverableError).toBe(true)
    expect(
      response.context.notificationRows[0].actions.find(
        (action) => action.text === 'Copy as new'
      ).idempotencyKey
    ).toBe('retry-this-key')
  })

  it('Should redirect an unknown source to the dashboard without copying', async () => {
    const response = await copyPost(
      journeyRequest('GBN-AG-26-UNKNOWN', {
        payload: {
          idempotencyKey: 'unused-key',
          copyOrigin: 'dashboard'
        },
        state: { [KNOWN_JOURNEYS_COOKIE]: [] }
      }),
      stubH()
    )

    expect(response.redirect).toBe('/')
  })
})
