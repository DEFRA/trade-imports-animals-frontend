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
  knownJourneysCookie
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
        state: { [knownJourneysCookie()]: [source.journeyId] }
      })

    const first = await copyPost(request(), stubH())
    const retry = await copyPost(request(), stubH())

    expect(retry.redirect).toBe(first.redirect)
  })

  it('Should distinguish a recoverable failure from an actionable key-reuse error', async () => {
    configureRecords('live-animals', { ...recordsStub, copy: realRecords.copy })
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

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity'
      }))
    )
    const keyReuseResponse = await copyPost(
      journeyRequest(source.journeyId, {
        payload: {
          idempotencyKey: 'rejected-copy-key',
          copyOrigin: 'dashboard'
        }
      }),
      stubH()
    )

    const retryAction =
      keyReuseResponse.context.notificationRows[0].actions.find(
        (action) => action.text === 'Copy as new'
      )
    expect(keyReuseResponse.statusCode).toBe(422)
    expect(keyReuseResponse.context.copyIdempotencyError).toBe(true)
    expect(keyReuseResponse.context.recoverableError).toBe(false)
    expect(
      keyReuseResponse.context.sharedCopy.copyIdempotencyError.body
    ).toContain('Try copying it again')
    expect(retryAction.idempotencyKey).not.toBe('rejected-copy-key')
    expect(retryAction.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('Should redirect an unknown source to the dashboard without copying', async () => {
    const response = await copyPost(
      journeyRequest('GBN-AG-26-UNKNOWN', {
        payload: {
          idempotencyKey: 'unused-key',
          copyOrigin: 'dashboard'
        },
        state: { [knownJourneysCookie()]: [] }
      }),
      stubH()
    )

    expect(response.redirect).toBe('/live-animals')
  })
})
