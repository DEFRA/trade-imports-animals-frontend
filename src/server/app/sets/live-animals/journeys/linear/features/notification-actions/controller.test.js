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
  SESSION_COOKIES
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
          concurrencyToken: '0',
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

  it('Should re-render the dashboard at 500 after a recoverable backend failure', async () => {
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
          concurrencyToken: '0',
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
  })

  it('Should redirect to the dashboard with ?staleToken=1 on 409 STALE_CONCURRENCY_TOKEN from copy', async () => {
    configureRecords({ ...recordsStub, copy: realRecords.copy })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        clone() {
          return this
        },
        json: async () => ({ code: 'STALE_CONCURRENCY_TOKEN' })
      }))
    )
    const source = await records.create()

    const response = await copyPost(
      journeyRequest(source.journeyId, {
        payload: {
          concurrencyToken: '0',
          copyOrigin: 'dashboard'
        }
      }),
      stubH()
    )

    expect(response.redirect).toBe('/?staleAction=1')
  })

  it('Should propagate a non-STALE_CONCURRENCY_TOKEN error thrown from copy', async () => {
    configureRecords({
      ...recordsStub,
      copy: async () => {
        throw new TypeError('programmer error')
      }
    })
    const source = await records.create()

    await expect(
      copyPost(
        journeyRequest(source.journeyId, {
          payload: { concurrencyToken: '0', copyOrigin: 'dashboard' }
        }),
        stubH()
      )
    ).rejects.toThrow('programmer error')
  })

  it('Should redirect an unknown source to the dashboard without copying', async () => {
    const response = await copyPost(
      journeyRequest('GBN-AG-26-UNKNOWN', {
        payload: {
          concurrencyToken: '0',
          copyOrigin: 'dashboard'
        },
        state: { [SESSION_COOKIES.knownJourneys]: [] }
      }),
      stubH()
    )

    expect(response.redirect).toBe('/')
  })
})
