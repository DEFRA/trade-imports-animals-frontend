import { SET_ID } from '../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  expectBackLinkIsPage,
  expectNoRefusalLogged,
  expectOneSaveFallbackLogged,
  getHandlerOf,
  postHandlerOf,
  unavailableBackendError,
  useStubbedJourney
} from '../../../../../../engine/test-support.js'
import { hubPath } from '../../../../../../shared/paths.js'
import { RUN_ACTIVE } from '../../../../../../flow/run-state.js'
import { dispatchPages } from '../index.js'

import * as additionalDetails from './controller.js'

const get = getHandlerOf(additionalDetails)
const post = postHandlerOf(additionalDetails)

describe('POST additional-details — invalid payload', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

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
      seed: { commodityLines: [{ commoditySelection: 'Cow' }] },
      payload: {
        animalsCertifiedFor: 'slaughter',
        containsUnweanedAnimals: 'no'
      },
      saveFailure: failure
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
  const UNWEANED_SEED = { commodityLines: [{ commoditySelection: 'Cow' }] }

  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should go to the overview with every answer blank and commit the blank answers', async () => {
    const result = await driveHandler(post, {
      seed: UNWEANED_SEED,
      payload: { exit: 'hub' }
    })
    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after.animalsCertifiedFor).toBe('')
    expect(result.after.containsUnweanedAnimals).toBe('')
  })

  it('Should still refuse an answer outside its allowed values and commit nothing', async () => {
    const result = await driveHandler(post, {
      seed: UNWEANED_SEED,
      payload: { containsUnweanedAnimals: 'perhaps', exit: 'hub' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.containsUnweanedAnimals).toBeDefined()
    expect(result.after).toEqual(result.before)
  })
})

describe('additional-details — the Back link', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const catLine = { commoditySelection: 'Cat', speciesSelection: '923501' }
  const fishLine = { commoditySelection: 'Fish', speciesSelection: '801204' }

  it('Should go Back to identification in the opening run when a chosen species needs identifiers', async () => {
    const result = await driveHandler(get, {
      seed: { countryOfOrigin: 'FR', commodityLines: [catLine] },
      openingRun: RUN_ACTIVE
    })
    expectBackLinkIsPage(result, 'commodities/identification')
  })

  it('Should go Back to the consignment details in the opening run when no chosen species needs identifiers', async () => {
    const result = await driveHandler(get, {
      seed: { countryOfOrigin: 'FR', commodityLines: [fishLine] },
      openingRun: RUN_ACTIVE
    })
    expectBackLinkIsPage(result, 'consignment-details')
  })

  it('Should keep Back on identification when the page is shown again after a refusal in the run', async () => {
    const result = await driveHandler(post, {
      seed: { countryOfOrigin: 'FR', commodityLines: [catLine] },
      payload: { animalsCertifiedFor: 'not-a-real-purpose' },
      openingRun: RUN_ACTIVE
    })
    expect(result.response.statusCode).toBe(400)
    expectBackLinkIsPage(result, 'commodities/identification')
  })

  it('Should go Back to the overview when the page is opened from the overview', async () => {
    const result = await driveHandler(get, {
      seed: { countryOfOrigin: 'FR', commodityLines: [catLine] }
    })
    expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
  })
})
