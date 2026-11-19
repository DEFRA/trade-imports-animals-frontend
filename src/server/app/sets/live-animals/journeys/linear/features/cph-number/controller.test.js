import { describe, expect, it } from 'vitest'

import {
  driveHandler,
  expectBackLinkIsPath,
  expectNoRefusalLogged,
  expectOneLogged,
  postHandlerOf,
  trailQuery,
  useStubbedJourney
} from '../../../../../../engine/test-support.js'
import { SET_ID } from '../../../../set.js'
import { dispatchPages } from '../index.js'
import { pagePath } from '../../../../../../shared/paths.js'
import { CYA_SLUG, withTrail } from '../../../../../../shared/kit.js'
import { TRAIL_START } from '../../../../../../shared/trail.js'

import { addressesPage } from '../addresses/page.js'
import { originPage } from '../origin/page.js'
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

  it('Should accept all three boxes empty, commit the number as empty and go to the consignment addresses page', async () => {
    const result = await driveHandler(postCph, {
      seed: seed(),
      payload: { cphCounty: '', cphParish: '', cphHolding: '' }
    })
    expect(result.view).toBeUndefined()
    expect(result.after.countyParishHoldingCph).toBe('')
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, addressesPage.slug)
    })
    expectNoRefusalLogged(result.logger)
  })

  it('Should clear a number saved before when all three boxes are submitted empty', async () => {
    const result = await driveHandler(postCph, {
      seed: { ...seed(), countyParishHoldingCph: '123456789' },
      payload: { cphCounty: '', cphParish: '', cphHolding: '' }
    })
    expect(result.after.countyParishHoldingCph).toBe('')
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

describe('cph-number — Back and Save and continue always answer the consignment addresses page', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const fromReview = { from: CYA_SLUG }

  describe('Back', () => {
    it('Should go to the consignment addresses page with no trail, reached from the section add link', async () => {
      const result = await driveWithQuery(getCph)
      expectBackLinkIsPath(
        result,
        pagePath(result.journeyId, addressesPage.slug)
      )
    })

    it('Should go to the consignment addresses page carrying the trail, reached from the overview', async () => {
      const result = await driveWithQuery(getCph, {
        query: trailQuery(TRAIL_START.overview)
      })
      expectBackLinkIsPath(
        result,
        withTrail(pagePath(result.journeyId, addressesPage.slug), [
          TRAIL_START.overview
        ])
      )
    })

    it('Should go to the consignment addresses page carrying the trail, reached from a review Change link', async () => {
      const result = await driveWithQuery(getCph, { query: fromReview })
      expectBackLinkIsPath(
        result,
        withTrail(pagePath(result.journeyId, addressesPage.slug), [CYA_SLUG])
      )
    })
  })

  describe('Save and continue', () => {
    it('Should go to the consignment addresses page with no trail, without joining it, reached from the section add link', async () => {
      const result = await driveWithQuery(postCph, { payload: VALID_PARTS })
      expect(result.response).toEqual({
        redirect: pagePath(result.journeyId, addressesPage.slug)
      })
    })

    it('Should go to the consignment addresses page carrying the trail, without joining it, reached from the overview', async () => {
      const result = await driveWithQuery(postCph, {
        payload: VALID_PARTS,
        query: trailQuery(TRAIL_START.overview)
      })
      expect(result.response).toEqual({
        redirect: withTrail(pagePath(result.journeyId, addressesPage.slug), [
          TRAIL_START.overview
        ])
      })
    })

    it('Should go to the consignment addresses page carrying the trail, without joining it, reached from a review Change link', async () => {
      const result = await driveWithQuery(postCph, {
        payload: VALID_PARTS,
        query: fromReview
      })
      expect(result.response).toEqual({
        redirect: withTrail(pagePath(result.journeyId, addressesPage.slug), [
          CYA_SLUG
        ])
      })
    })
  })
})

describe('cph-number — Save and continue when the country of origin is still missing', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should go to the page that asks for the country of origin, not the consignment addresses page, logging the landing once', async () => {
    const result = await driveHandler(postCph, {
      seed: { commodityLines: [{ commodityCode: '0102' }] },
      payload: VALID_PARTS
    })
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, originPage.slug)
    })
    expectOneLogged(result.logger, {
      level: 'info',
      message:
        'Save and continue opened the page that asks for a missing earlier answer',
      fields: {
        journeyId: result.journeyId,
        savedPageId: cphNumberPage.id,
        unopenedPageId: addressesPage.id,
        missingAnswerIds: ['countryOfOrigin']
      }
    })
  })
})

describe('cph-number — a consignment whose commodities do not call for the number', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const horsesOnly = () => ({
    countryOfOrigin: 'FR',
    commodityLines: [{ commodityCode: '0101' }]
  })

  it('Should answer the consignment addresses page, render nothing and log once on a GET', async () => {
    const result = await driveHandler(getCph, { seed: horsesOnly() })
    expect(result.view).toBeUndefined()
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, addressesPage.slug)
    })
    expectOneLogged(result.logger, {
      level: 'info',
      message:
        'County parish holding number skipped: no commodity on this consignment needs one',
      fields: {
        journeyId: result.journeyId,
        reason: 'cph-number-not-in-scope',
        commodityCodes: ['0101']
      }
    })
  })

  it('Should save nothing and answer the consignment addresses page on a POST', async () => {
    const result = await driveHandler(postCph, {
      seed: horsesOnly(),
      payload: VALID_PARTS
    })
    expect(result.after.countyParishHoldingCph).toBeUndefined()
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, addressesPage.slug)
    })
  })
})
