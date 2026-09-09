import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  journeyRequest,
  postHandlerOf,
  stubH
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import { hubPath, pagePath } from '../../../../../../shared/paths.js'

import * as cphNumber from './controller.js'

const postCph = postHandlerOf(cphNumber)
const getCph = cphNumber.routes.find((route) => route.method === 'GET').handler

const VALID_PARTS = { cphCounty: '12', cphParish: '345', cphHolding: '6789' }

const seed = () => ({ commodityLines: [{ commoditySelection: 'Cow' }] })

const driveWithQuery = async (handler, { payload = {}, query = {} } = {}) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed())
  const h = stubH()
  const response = await handler(
    journeyRequest(journey.journeyId, { payload, query }),
    h
  )
  return {
    journeyId: journey.journeyId,
    response,
    view: h.captured.view
  }
}

describe('POST cph-number — three parts joined into the nine stored digits', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should join the county, parish and holding parts into nine bare digits', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: VALID_PARTS
    })
    expect(result.view).toBeUndefined()
    expect(result.after.countyParishHoldingCph).toBe('123456789')
  })

  it('Should trim each part before joining it', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { cphCounty: ' 12 ', cphParish: ' 345', cphHolding: '6789 ' }
    })
    expect(result.view).toBeUndefined()
    expect(result.after.countyParishHoldingCph).toBe('123456789')
  })

  it('Should answer an untouched page with the whole question at the first box', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { cphCounty: '', cphParish: '', cphHolding: '' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      cphCounty: 'Enter a CPH number'
    })
    expect(result.after.countyParishHoldingCph).toBeUndefined()
  })

  it('Should name the missing part when the others are answered', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { ...VALID_PARTS, cphParish: '' }
    })
    expect(result.view.context.errors).toEqual({
      cphParish: 'Enter the parish'
    })
    expect(result.after.countyParishHoldingCph).toBeUndefined()
  })

  it('Should hold each part to its own length', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { cphCounty: '1', cphParish: '34', cphHolding: '678' }
    })
    expect(result.view.context.errors).toEqual({
      cphCounty: 'County must be 2 digits',
      cphParish: 'Parish must be 3 digits',
      cphHolding: 'Holding number must be 4 digits'
    })

    // GDS: the summary lists errors in the order the boxes appear on the page.
    // toEqual on the errors object above ignores key order, so reordering the
    // three requiredExactDigits calls in compose() would silently invert the
    // summary while every other assertion stayed green.
    expect(
      result.view.context.errorSummary.errorList.map(({ href }) => href)
    ).toEqual(['#cphCounty', '#cphParish', '#cphHolding'])
    expect(result.after.countyParishHoldingCph).toBeUndefined()
  })

  it('Should reject non-digits in a part, echoing what the trader typed', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { ...VALID_PARTS, cphHolding: '678a' }
    })
    expect(result.view.context.errors).toEqual({
      cphHolding: 'Holding number must only contain numbers'
    })
    expect(result.view.context.values).toEqual({
      ...VALID_PARTS,
      cphHolding: '678a'
    })
    expect(result.after.countyParishHoldingCph).toBeUndefined()
  })

  it('Should reject slashes typed into a part, so the parts stay the parts', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { cphCounty: '12/345/6789', cphParish: '', cphHolding: '' }
    })
    expect(result.view.context.errors).toEqual({
      cphCounty: 'County must be 2 digits',
      cphParish: 'Enter the parish',
      cphHolding: 'Enter the holding number'
    })
    expect(result.after.countyParishHoldingCph).toBeUndefined()
  })
})

describe('GET cph-number — the stored number back in its parts', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should show three empty boxes when nothing is stored', async () => {
    const result = await driveHandler(getCph, { seed: seed() })
    expect(result.view.context.values).toEqual({
      cphCounty: '',
      cphParish: '',
      cphHolding: ''
    })
  })

  it('Should split the stored nine digits 2/3/4', async () => {
    const result = await driveHandler(getCph, {
      seed: { ...seed(), countyParishHoldingCph: '123456789' }
    })
    expect(result.view.context.values).toEqual(VALID_PARTS)
  })

  // Answers seeded by fixtures still carry the slashed form the page used to
  // accept, so the split reads digits only rather than slicing the separators.
  it('Should split a stored value that still carries slashes', async () => {
    const result = await driveHandler(getCph, {
      seed: { ...seed(), countyParishHoldingCph: '12/345/6789' }
    })
    expect(result.view.context.values).toEqual(VALID_PARTS)
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
        pagePath(result.journeyId, 'addresses')
      )
    })

    it('Should back-link to the main hub on a sequential-walk entry', async () => {
      const result = await driveWithQuery(getCph)
      expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
    })
  })

  describe('POST /cph-number', () => {
    it('Should save and return to the addresses hub when entered from its CPH row', async () => {
      const result = await driveWithQuery(postCph, {
        payload: VALID_PARTS,
        query: { return: 'addresses' }
      })
      expect(result.response).toEqual({
        redirect: pagePath(result.journeyId, 'addresses')
      })
    })

    it('Should keep the sequential exit to the main hub when entered without return context', async () => {
      const result = await driveWithQuery(postCph, {
        payload: VALID_PARTS
      })
      expect(result.response).toEqual({
        redirect: hubPath(result.journeyId)
      })
    })
  })
})
