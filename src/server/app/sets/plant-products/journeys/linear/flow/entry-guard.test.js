import Hapi from '@hapi/hapi'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { nunjucksConfig } from '../../../../../../../config/nunjucks/nunjucks.js'
import { configureObligationSet } from '../../../../../model/obligations/manifest.js'
import { createPath, hubPath, pagePath } from '../../../../../shared/paths.js'
import { withSetContext } from '../../../../../shared/set-context.js'
import { plantProducts } from '../../../../../routes-plant-products.js'
import { RUN_ACTIVE } from '../../../../../flow/run-state.js'
import { SESSION_COOKIE_NAMES } from '../config.js'
import * as plantProductsObligationSet from '../../../obligations/index.js'
import { records } from '../../../services/records/stub.js'
import { importTypePage } from '../features/import-type/page.js'
import {
  entryGuardTarget,
  guardedJourneyPath,
  hasCommittedNotificationAnswers,
  parseJourneyPath
} from './entry-guard.js'

const PLANT_PRODUCTS = 'plant-products'
const LIVE_ANIMALS = 'live-animals'
const fixtureObligation = {
  id: '53b27cd5-05b5-40ff-b709-d7444717d71d',
  name: 'fixtureAnswer',
  status: 'mandatory'
}
const fixtureObligationSet = {
  obligations: [fixtureObligation],
  groups: [],
  policy: {
    systemPopulated: [],
    enforcedAtContinue: [],
    maxEntriesFrom: {},
    systemAnswerKeys: ['referenceNumber']
  }
}

const inSet = (setId, fn) => withSetContext(setId, fn)

const captureH = () => ({
  state: vi.fn()
})

const requestFor = (journeyId, path, state = {}) => ({
  app: {},
  params: { journeyId },
  path,
  state
})

describe('plant-products entry guard', () => {
  let server

  beforeAll(async () => {
    server = Hapi.server()
    await server.register(nunjucksConfig)
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
    await server.initialize()
  })

  afterEach(async () => {
    configureObligationSet(PLANT_PRODUCTS, plantProductsObligationSet)
    await records.clear()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('guards hub and page paths but exempts create, actions and the entry surface', () => {
    inSet(PLANT_PRODUCTS, () => {
      expect(guardedJourneyPath(createPath())).toBe(false)
      for (const slug of ['amend', 'cancel-amend', 'copy', 'delete']) {
        expect(guardedJourneyPath(pagePath('journey-1', slug))).toBe(false)
      }
      expect(
        guardedJourneyPath(pagePath('journey-1', importTypePage.slug))
      ).toBe(false)
      expect(
        guardedJourneyPath(
          pagePath('journey-1', `${importTypePage.slug}/not-available`)
        )
      ).toBe(false)
      expect(guardedJourneyPath('/not-a-journey')).toBe(false)
      expect(guardedJourneyPath(pagePath('journey-1', 'origin'))).toBe(true)
      expect(guardedJourneyPath(hubPath('journey-1'))).toBe(true)
    })
  })

  it('resolves the prefixed journey path per set on every call', () => {
    expect(
      inSet(PLANT_PRODUCTS, () =>
        guardedJourneyPath('/plant-products/notifications/journey-1/origin')
      )
    ).toBe(true)
    expect(
      inSet(PLANT_PRODUCTS, () =>
        guardedJourneyPath('/live-animals/notifications/journey-1/origin')
      )
    ).toBe(false)
    expect(
      inSet(LIVE_ANIMALS, () =>
        guardedJourneyPath('/live-animals/notifications/journey-1/origin')
      )
    ).toBe(true)
    expect(
      inSet(LIVE_ANIMALS, () =>
        guardedJourneyPath('/plant-products/notifications/journey-1/origin')
      )
    ).toBe(false)
  })

  it('extracts the bare journey id from a request path carrying the mount prefix', () => {
    expect(
      inSet(PLANT_PRODUCTS, () =>
        parseJourneyPath(
          '/plant-products/notifications/GBN-PP-26-ABC123/origin'
        )
      )
    ).toEqual({ journeyId: 'GBN-PP-26-ABC123', slug: 'origin' })
  })

  it('counts only answered manifest obligations as committed progress', () => {
    configureObligationSet(PLANT_PRODUCTS, fixtureObligationSet)

    inSet(PLANT_PRODUCTS, () => {
      expect(hasCommittedNotificationAnswers({})).toBe(false)
      expect(
        hasCommittedNotificationAnswers({ importType: 'plant-products' })
      ).toBe(false)
      expect(hasCommittedNotificationAnswers({ fixtureAnswer: '' })).toBe(false)
      expect(hasCommittedNotificationAnswers({ fixtureAnswer: 'yes' })).toBe(
        true
      )
    })
  })

  it('refuses a cold prefixed deep link by targeting the plant entry filter', async () => {
    const journey = await records.create()
    const target = await inSet(PLANT_PRODUCTS, () =>
      entryGuardTarget(
        requestFor(
          journey.journeyId,
          `/plant-products/notifications/${journey.journeyId}/origin`
        ),
        captureH()
      )
    )

    expect(target).toBe(
      inSet(PLANT_PRODUCTS, () =>
        pagePath(journey.journeyId, importTypePage.slug)
      )
    )
  })

  it('passes a journey that entered through the filter', async () => {
    const journey = await records.create()
    const target = await inSet(PLANT_PRODUCTS, () =>
      entryGuardTarget(
        requestFor(journey.journeyId, hubPath(journey.journeyId), {
          [SESSION_COOKIE_NAMES.openingRun]: {
            [journey.journeyId]: RUN_ACTIVE
          }
        }),
        captureH()
      )
    )

    expect(target).toBeNull()
  })

  it('passes a journey with a committed manifest answer', async () => {
    configureObligationSet(PLANT_PRODUCTS, fixtureObligationSet)
    const journey = await records.create()
    await records.replaceFulfilment(journey.journeyId, {
      [fixtureObligation.id]: 'yes'
    })
    const target = await inSet(PLANT_PRODUCTS, () =>
      entryGuardTarget(
        requestFor(journey.journeyId, hubPath(journey.journeyId)),
        captureH()
      )
    )

    expect(target).toBeNull()
  })

  it('does not read journey state for an unguarded path', async () => {
    await expect(
      inSet(PLANT_PRODUCTS, () =>
        entryGuardTarget(requestFor('missing', '/plant-products'), captureH())
      )
    ).resolves.toBeNull()
  })
})
