import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import {
  driveHandler,
  journeyRequest,
  postHandlerOf,
  stubH
} from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as cphNumber from './controller.js'

const postCph = postHandlerOf(cphNumber)
const getCph = cphNumber.routes.find((route) => route.method === 'GET').handler

const seed = () => ({ commodityLines: [{ commoditySelection: 'Cow' }] })

const driveWithQuery = async (handler, { payload = {}, query = {} } = {}) => {
  const journey = await store.create()
  await store.saveAnswers(journey.journeyId, seed())
  const h = stubH()
  const response = await handler(
    journeyRequest(journey.journeyId, { payload, query }),
    h
  )
  return { response, view: h.captured.view }
}

describe('POST cph-number — slash stripping', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should commit the CPH with slashes stripped', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { countyParishHoldingCph: '12/345/6789' }
    })
    expect(result.view).toBeUndefined()
    expect(result.after.countyParishHoldingCph).toBe('123456789')
  })

  it('Should validate the stripped value, not the raw value', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { countyParishHoldingCph: '123456789/12' }
    })
    expect(result.view).toBeUndefined()
    expect(result.after.countyParishHoldingCph).toBe('12345678912')
  })
})

describe('cph-number — addresses-hub entry (?return=addresses)', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should back-link to the addresses hub when entered from its CPH row', async () => {
    const result = await driveWithQuery(getCph, {
      query: { return: 'addresses' }
    })
    expect(result.view.context.backLink).toBe(
      '/prototype-standalone/live-animals/addresses'
    )
  })

  it('Should back-link to the main hub on a sequential-walk entry', async () => {
    const result = await driveWithQuery(getCph)
    expect(result.view.context.backLink).toBe(
      '/prototype-standalone/live-animals/hub'
    )
  })

  it('Should save and return to the addresses hub when entered from its CPH row', async () => {
    const result = await driveWithQuery(postCph, {
      payload: { countyParishHoldingCph: '12/345/6789' },
      query: { return: 'addresses' }
    })
    expect(result.response).toEqual({
      redirect: '/prototype-standalone/live-animals/addresses'
    })
  })

  it('Should keep the sequential exit to the main hub when entered without return context', async () => {
    const result = await driveWithQuery(postCph, {
      payload: { countyParishHoldingCph: '12/345/6789' }
    })
    expect(result.response).toEqual({
      redirect: '/prototype-standalone/live-animals/hub'
    })
  })
})
