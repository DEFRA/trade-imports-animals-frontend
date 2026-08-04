import Hapi from '@hapi/hapi'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import {
  driveHandler,
  journeyRequest,
  postHandlerOf,
  stubH
} from '../../../../../../engine/test-support.js'
import * as navigation from '../../../../../../flow/navigation.js'
import { plantProducts } from '../../../../../../routes-plant-products.js'
import {
  enterSetContext,
  withSetContext
} from '../../../../../../shared/set-context.js'
import { records } from '../../../../services/records/stub.js'
import * as checkAnswers from './controller.js'
import { copy } from './copy/copy.en.js'

const get = checkAnswers.routes.find(({ method }) => method === 'GET').handler
const post = postHandlerOf(checkAnswers)
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

describe('plant-products check-answers controller', () => {
  let server

  beforeAll(async () => {
    server = Hapi.server()
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
  })

  beforeEach(async () => {
    enterSetContext('plant-products')
    await records.clear()
  })

  afterAll(async () => server.stop({ timeout: 0 }))

  it('GET renders sections, the dynamic journey strip and the hub back link', async () => {
    const result = await drive(get, {
      seed: { importType: 'plants', internalReference: 'GET-038' }
    })

    expect(result.view.view).toBe(
      'plant-products/journeys/linear/features/check-answers/template'
    )
    expect(result.view.context.pageTitle).toBe(copy.title)
    expect(result.view.context.sections).toHaveLength(9)
    expect(result.view.context.journeyStrip.reference).toMatch(/^GBN-PP-/)
    expect(result.view.context.backLink).toMatch(
      /^\/plant-products\/notifications\/[^/]+$/
    )
    expect(result.view.context.breadcrumbs).toBeDefined()
  })

  it('GET only renders Copy for SUBMITTED and mints a fresh key per render', async () => {
    const draft = await drive(get, {
      seed: { importType: 'plants', internalReference: 'READ-ONLY-097' }
    })
    expect(draft.view.context.readOnly).toBe(false)
    expect(draft.view.context.copyAction).toBeNull()

    await records.finalise(draft.journeyId)
    const firstH = stubH()
    await withSetContext('plant-products', () =>
      get(journeyRequest(draft.journeyId), firstH)
    )
    const secondH = stubH()
    await withSetContext('plant-products', () =>
      get(journeyRequest(draft.journeyId), secondH)
    )

    const firstAction = firstH.captured.view.context.copyAction
    const secondAction = secondH.captured.view.context.copyAction

    expect(firstH.captured.view.context.readOnly).toBe(true)
    expect(firstAction.href).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/copy$/
    )
    expect(firstAction.idempotencyKey).toEqual(expect.any(String))
    expect(secondAction.idempotencyKey).not.toBe(firstAction.idempotencyKey)
  })

  it('POST redirects through nextInSection and commits nothing', async () => {
    const next = vi
      .spyOn(navigation, 'nextInSection')
      .mockReturnValue('/plant-products/notifications/journey-038/next')
    const seed = { internalReference: 'UNCHANGED-038' }
    const result = await drive(post, { seed })

    expect(result.response.redirect).toBe(
      '/plant-products/notifications/journey-038/next'
    )
    expect(result.after).toEqual(seed)
    expect(next).toHaveBeenCalledWith(
      'review-notification',
      expect.any(Object),
      expect.any(String)
    )
  })
})
