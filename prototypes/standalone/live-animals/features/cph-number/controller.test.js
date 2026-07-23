import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
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

describe('POST cph-number — the 9-digit rule after slash stripping', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should commit a 9-digit CPH', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { countyParishHoldingCph: '123456789' }
    })
    expect(result.view).toBeUndefined()
    expect(result.after.countyParishHoldingCph).toBe('123456789')
  })

  it('Should validate the stripped value, not the raw value, and commit it stripped', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { countyParishHoldingCph: '12/345/6789' }
    })
    expect(result.view).toBeUndefined()
    expect(result.after.countyParishHoldingCph).toBe('123456789')
  })

  it('Should reject a blank submit, committing nothing', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { countyParishHoldingCph: '' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      countyParishHoldingCph: 'Enter a CPH number'
    })
    expect(result.after.countyParishHoldingCph).toBeUndefined()
  })

  it('Should reject a stripped value shorter than 9 digits', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { countyParishHoldingCph: '12/345/678' }
    })
    expect(result.view.context.errors).toEqual({
      countyParishHoldingCph: 'CPH number must be exactly 9 digits'
    })
    expect(result.after.countyParishHoldingCph).toBeUndefined()
  })

  it('Should reject a stripped value longer than 9 digits, echoing the raw input', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { countyParishHoldingCph: '123456789/12' }
    })
    expect(result.view.context.errors).toEqual({
      countyParishHoldingCph: 'CPH number must be exactly 9 digits'
    })
    expect(result.view.context.values.countyParishHoldingCph).toBe(
      '123456789/12'
    )
    expect(result.after.countyParishHoldingCph).toBeUndefined()
  })

  it('Should reject non-digit characters', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { countyParishHoldingCph: '12345678a' }
    })
    expect(result.view.context.errors).toEqual({
      countyParishHoldingCph: 'CPH number must only contain numbers'
    })
    expect(result.after.countyParishHoldingCph).toBeUndefined()
  })
})

describe('cph-number — addresses-hub entry (?return=addresses)', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  describe('GET /cph-number', () => {
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
  })

  describe('POST /cph-number', () => {
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
})
