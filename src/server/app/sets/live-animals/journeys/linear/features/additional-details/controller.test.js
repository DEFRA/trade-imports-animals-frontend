import { SET_ID } from '../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import {
  driveHandler,
  trailQuery,
  expectBackLinkIsPath,
  refusingSaves,
  expectNoRefusalLogged,
  expectOneSaveFallbackLogged,
  getHandlerOf,
  postHandlerOf,
  unavailableBackendError,
  useStubbedJourney
} from '../../../../../../engine/test-support.js'
import {
  BOS_TAURUS_ROW,
  FELIS_CATUS_ROW,
  STRUTHIO_ROW
} from '../commodities/search/test-support.js'
import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import { TRAIL_START, withTrail } from '../../../../../../shared/kit.js'
import { itSendsBackToWhereTheTraderCameFrom } from '../../test-support.js'
import { validatorDefaults } from '../../../../../../shared/copy.en.js'
import { dispatchPages } from '../index.js'

import * as additionalDetails from './controller.js'

const get = getHandlerOf(additionalDetails)
const post = postHandlerOf(additionalDetails)

const UNWEANED_SEED = { commodityLines: [{ commodityCode: '0102' }] }

beforeAll(() => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  buildDispatch(SET_ID, dispatchPages)
})
beforeEach(() => store.clear())

describe('POST additional-details — invalid payload', () => {
  it('Should answer 400 and re-render an out-of-list certification, committing nothing', async () => {
    const result = await driveHandler(post, {
      payload: { animalsCertifiedFor: 'not-a-real-purpose' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.animalsCertifiedFor).toBeDefined()
    expect(result.after).toEqual(result.before)
    expectNoRefusalLogged(result.logger)
  })
})

describe('POST additional-details — backend unavailable', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should re-render at 500 with the unweaned question still asked and log the save fallback once', async () => {
    const failure = unavailableBackendError('save answers')

    const result = await driveHandler(post, {
      seed: { commodityLines: [BOS_TAURUS_ROW] },
      payload: {
        animalsCertifiedFor: 'slaughter',
        containsUnweanedAnimals: 'no'
      },
      startingFrom: [refusingSaves(failure)]
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.view.context.showUnweaned).toBe(true)
    expectOneSaveFallbackLogged(result.logger, {
      journeyId: result.journeyId,
      err: failure
    })
  })
})

describe('POST additional-details — Save and return to overview', () => {
  it('Should go to the overview with every answer blank and commit the blank answers', async () => {
    const result = await driveHandler(post, {
      seed: UNWEANED_SEED,
      payload: { exit: 'hub' }
    })
    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after.animalsCertifiedFor).toBe('')
    expect(result.after.containsUnweanedAnimals).toBe('')
  })

  it('Should refuse an out-of-list unweaned answer with the shared default message and keep the valid certification answer submitted alongside it', async () => {
    const result = await driveHandler(post, {
      seed: UNWEANED_SEED,
      payload: {
        animalsCertifiedFor: 'slaughter',
        containsUnweanedAnimals: 'perhaps',
        exit: 'hub'
      }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.containsUnweanedAnimals).toBe(
      validatorDefaults.oneOf
    )
    expect(result.view.context.values.animalsCertifiedFor).toBe('slaughter')
    expect(result.after).toEqual(result.before)
  })
})

describe('additional-details — the Back link', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const IDENTIFICATION_SLUG = 'commodities/identification'
  const CONSIGNMENT_DETAILS_SLUG = 'consignment-details'

  it('Should go Back to commodity details when commodity details was the page saved', async () => {
    const result = await driveHandler(get, {
      seed: { countryOfOrigin: 'FR', commodityLines: [STRUTHIO_ROW] },
      startingFrom: [
        { query: trailQuery(TRAIL_START.overview, CONSIGNMENT_DETAILS_SLUG) }
      ]
    })

    expectBackLinkIsPath(
      result,
      withTrail(pagePath(result.journeyId, CONSIGNMENT_DETAILS_SLUG), [
        TRAIL_START.overview
      ])
    )
  })

  it('Should keep Back on identification when the page is shown again after a refusal', async () => {
    const result = await driveHandler(post, {
      seed: { countryOfOrigin: 'FR', commodityLines: [FELIS_CATUS_ROW] },
      payload: { animalsCertifiedFor: 'not-a-real-purpose' },
      startingFrom: [
        { query: trailQuery(TRAIL_START.overview, IDENTIFICATION_SLUG) }
      ]
    })

    expect(result.response.statusCode).toBe(400)
    expectBackLinkIsPath(
      result,
      withTrail(pagePath(result.journeyId, IDENTIFICATION_SLUG), [
        TRAIL_START.overview
      ])
    )
  })

  itSendsBackToWhereTheTraderCameFrom(get, {
    seed: { countryOfOrigin: 'FR', commodityLines: [FELIS_CATUS_ROW] },
    previousPage: IDENTIFICATION_SLUG
  })
})
