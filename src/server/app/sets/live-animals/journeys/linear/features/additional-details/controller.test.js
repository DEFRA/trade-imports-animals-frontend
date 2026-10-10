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
  postHandlerOf
} from '../../../../../../engine/test-support.js'
import { hubPath } from '../../../../../../shared/paths.js'
import { dispatchPages } from '../index.js'

import * as additionalDetails from './controller.js'

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

  it('Should go to the overview with every answer blank and commit nothing', async () => {
    const result = await driveHandler(post, {
      seed: UNWEANED_SEED,
      payload: { exit: 'hub' }
    })
    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after.animalsCertifiedFor).toBeUndefined()
    expect(result.after.containsUnweanedAnimals).toBeUndefined()
  })

  it('Should keep the earlier answers when both questions come back blank', async () => {
    const seed = {
      ...UNWEANED_SEED,
      animalsCertifiedFor: 'slaughter',
      containsUnweanedAnimals: 'no'
    }
    const result = await driveHandler(post, { seed, payload: { exit: 'hub' } })
    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after.animalsCertifiedFor).toBe('slaughter')
    expect(result.after.containsUnweanedAnimals).toBe('no')
  })

  it('Should keep the earlier answers when Save and continue comes back with both questions blank', async () => {
    const seed = {
      ...UNWEANED_SEED,
      animalsCertifiedFor: 'slaughter',
      containsUnweanedAnimals: 'no'
    }
    const result = await driveHandler(post, { seed, payload: {} })
    expect(result.response.statusCode).toBeUndefined()
    expect(result.after.animalsCertifiedFor).toBe('slaughter')
    expect(result.after.containsUnweanedAnimals).toBe('no')
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
