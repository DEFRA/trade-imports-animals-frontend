import Hapi from '@hapi/hapi'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureReadyForCheckYourAnswers } from '../../../../../../engine/read.js'
import { store } from '../../../../../../engine/store.js'
import {
  driveHandler,
  journeyRequest,
  postHandlerOf,
  stubH
} from '../../../../../../engine/test-support.js'
import { plantProducts } from '../../../../../../routes-plant-products.js'
import {
  enterSetContext,
  withSetContext
} from '../../../../../../shared/set-context.js'
import { records as realRecords } from '../../../../services/records/real.js'
import { records as recordsStub } from '../../../../services/records/stub.js'
import * as declaration from './controller.js'
import { copy } from './copy/copy.en.js'

const get = declaration.routes.find(({ method }) => method === 'GET').handler
const post = postHandlerOf(declaration)
const inPlantProducts = (operation) =>
  withSetContext('plant-products', operation)
const drive = (handler, options) =>
  inPlantProducts(() => driveHandler(handler, options))

describe('plant-products declaration controller', () => {
  let server

  beforeAll(async () => {
    server = Hapi.server()
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
  })

  beforeEach(async () => {
    enterSetContext('plant-products')
    configureRecords('plant-products', recordsStub)
    configureReadyForCheckYourAnswers(() => true)
    await inPlantProducts(() => store.clear())
  })

  afterEach(() => {
    configureRecords('plant-products', recordsStub)
    vi.unstubAllGlobals()
  })

  afterAll(async () => server.stop({ timeout: 0 }))

  it('GET renders the declaration, current date and plant review back link', async () => {
    const result = await drive(get)

    expect(result.view.view).toBe(
      'plant-products/journeys/linear/features/declaration/template'
    )
    expect(result.view.context.copy.title).toBe(copy.title)
    expect(result.view.context.values).toEqual({ declaration: '' })
    expect(result.view.context.submissionDate).toMatch(
      /^\d{1,2} [A-Z][a-z]+ \d{4}$/
    )
    expect(result.view.context.backLink).toBe(
      `/plant-products/notifications/${result.journeyId}/review-notification`
    )
  })

  it('POST without confirmation returns 400 and persists nothing', async () => {
    const result = await drive(post, {
      payload: { declaration: '' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.declaration).toBe(
      copy.errors.declarationRequired
    )
    expect(result.view.context.values).toEqual({ declaration: '' })
    await expect(
      recordsStub.load({ journeyId: result.journeyId })
    ).resolves.toMatchObject({
      status: 'draft',
      submittedAt: null,
      fulfilment: {}
    })
  })

  it('POST with confirmation finalises the record and targets the unbuilt confirmation landing', async () => {
    const result = await drive(post, {
      payload: { declaration: 'confirmed' }
    })
    const persisted = await recordsStub.load({ journeyId: result.journeyId })

    expect(result.response).toEqual({
      redirect: `/plant-products/notifications/${result.journeyId}/confirmation`
    })
    expect(persisted).toMatchObject({
      status: 'submitted',
      submittedAt: expect.any(String),
      fulfilment: {}
    })
  })

  it('not-ready submission persists no submitted record and returns to review', async () => {
    configureReadyForCheckYourAnswers(() => false)

    const result = await drive(post, {
      payload: { declaration: 'confirmed' }
    })

    await expect(
      recordsStub.load({ journeyId: result.journeyId })
    ).resolves.toMatchObject({
      status: 'draft',
      submittedAt: null,
      fulfilment: {}
    })
    expect(result.response).toEqual({
      redirect: `/plant-products/notifications/${result.journeyId}/review-notification`
    })
  })

  it('POST on an already-submitted journey redirects without writing again', async () => {
    const journey = await recordsStub.create()
    await recordsStub.finalise(journey.journeyId)
    const before = await recordsStub.load({ journeyId: journey.journeyId })

    const response = await inPlantProducts(() =>
      post(
        journeyRequest(journey.journeyId, {
          payload: { declaration: 'confirmed' }
        }),
        stubH()
      )
    )

    expect(response).toEqual({
      redirect: `/plant-products/notifications/${journey.journeyId}/confirmation`
    })
    await expect(
      recordsStub.load({ journeyId: journey.journeyId })
    ).resolves.toEqual(before)
  })

  it('GET on an already-submitted journey redirects without writing again', async () => {
    const journey = await recordsStub.create()
    await recordsStub.finalise(journey.journeyId)
    const before = await recordsStub.load({ journeyId: journey.journeyId })

    const response = await inPlantProducts(() =>
      get(journeyRequest(journey.journeyId), stubH())
    )

    expect(response).toEqual({
      redirect: `/plant-products/notifications/${journey.journeyId}/confirmation`
    })
    await expect(
      recordsStub.load({ journeyId: journey.journeyId })
    ).resolves.toEqual(before)
  })

  it('re-renders the checked value after a recoverable finalise failure', async () => {
    configureRecords('plant-products', {
      ...recordsStub,
      finalise: realRecords.finalise
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      }))
    )

    const result = await drive(post, {
      payload: { declaration: 'confirmed', crumb: 'test-crumb' }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.view.context.values).toEqual({ declaration: 'confirmed' })
  })

  it('does not hide an unexpected finalise failure', async () => {
    configureRecords('plant-products', {
      ...recordsStub,
      finalise: realRecords.finalise
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network contract broke')
      })
    )

    await expect(
      drive(post, { payload: { declaration: 'confirmed' } })
    ).rejects.toThrow('network contract broke')
  })
})
