import { describe, expect, it } from 'vitest'

import {
  driveHandler,
  expectNoRefusalLogged,
  postHandlerOf,
  useStubbedJourney
} from '../../../../../../engine/test-support.js'
import { SET_ID } from '../../../../set.js'
import { dispatchPages } from '../index.js'
import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import { CYA_SLUG, withTrail } from '../../../../../../shared/kit.js'

import { addressesPage } from '../addresses/page.js'
import { cphNumberPage } from './page.js'
import * as cphNumber from './controller.js'

const postCph = postHandlerOf(cphNumber)
const getCph = cphNumber.routes.find((route) => route.method === 'GET').handler

const SLASHED_CPH_NUMBER = '12/345/6789'
const VALID_PARTS = { cphCounty: '12', cphParish: '345', cphHolding: '6789' }

const seed = () => ({
  countryOfOrigin: 'FR',
  commodityLines: [{ commodityCode: '0102' }]
})

const driveWithQuery = (handler, options = {}) =>
  driveHandler(handler, { seed: seed(), ...options })

describe('POST cph-number — the CPH number saved as nine digits or refused per part', () => {
  useStubbedJourney(SET_ID, dispatchPages)

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
    expectNoRefusalLogged(result.logger)
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

  it('Should hold each part to its own length and list the summary errors in page order', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { cphCounty: '1', cphParish: '34', cphHolding: '678' }
    })
    expect(result.view.context.errors).toEqual({
      cphCounty: 'County must be 2 digits',
      cphParish: 'Parish must be 3 digits',
      cphHolding: 'Holding number must be 4 digits'
    })

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

  it('Should save a whole number with slashes typed into the county box as nine digits', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { cphCounty: SLASHED_CPH_NUMBER, cphParish: '', cphHolding: '' }
    })
    expect(result.view).toBeUndefined()
    expect(result.after.countyParishHoldingCph).toBe('123456789')
  })

  it('Should name each part and echo what was typed when the county box holds fewer than nine digits', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { cphCounty: '1234', cphParish: '', cphHolding: '' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      cphCounty: 'County must be 2 digits',
      cphParish: 'Enter the parish',
      cphHolding: 'Enter the holding number'
    })
    expect(result.view.context.values).toEqual({
      cphCounty: '1234',
      cphParish: '',
      cphHolding: ''
    })
    expect(result.after.countyParishHoldingCph).toBeUndefined()
  })
})

describe('GET cph-number — the stored number back in its parts', () => {
  useStubbedJourney(SET_ID, dispatchPages)

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

  it('Should split a stored value that still carries slashes', async () => {
    const result = await driveHandler(getCph, {
      seed: { ...seed(), countyParishHoldingCph: SLASHED_CPH_NUMBER }
    })
    expect(result.view.context.values).toEqual(VALID_PARTS)
  })
})

describe('cph-number — entry from the addresses page (?return=addresses)', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const fromReview = { from: CYA_SLUG }

  describe('GET /cph-number', () => {
    it('Should back-link to the addresses page carrying the trail when entered from its CPH section add link', async () => {
      const result = await driveWithQuery(getCph, {
        query: { return: addressesPage.slug, ...fromReview }
      })
      expect(result.view.context.backLink).toBe(
        withTrail(pagePath(result.journeyId, addressesPage.slug), [CYA_SLUG])
      )
    })

    it('Should back-link to the review when entered from a review Change link', async () => {
      const result = await driveWithQuery(getCph, { query: fromReview })
      expect(result.view.context.backLink).toBe(
        pagePath(result.journeyId, CYA_SLUG)
      )
    })

    it('Should back-link to the overview when nothing says where the trader came from', async () => {
      const result = await driveWithQuery(getCph)
      expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
    })
  })

  describe('POST /cph-number', () => {
    it('Should save and return to the addresses page carrying the trail when entered from its CPH section add link', async () => {
      const result = await driveWithQuery(postCph, {
        payload: VALID_PARTS,
        query: { return: addressesPage.slug, ...fromReview }
      })
      expect(result.response).toEqual({
        redirect: withTrail(pagePath(result.journeyId, addressesPage.slug), [
          CYA_SLUG
        ])
      })
    })

    it('Should go to the consignment addresses page with the CPH page on the trail when entered from a review Change link without return=addresses', async () => {
      const result = await driveWithQuery(postCph, {
        payload: VALID_PARTS,
        query: fromReview
      })
      expect(result.response).toEqual({
        redirect: withTrail(pagePath(result.journeyId, addressesPage.slug), [
          CYA_SLUG,
          cphNumberPage.slug
        ])
      })
    })
  })
})
