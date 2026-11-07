import { SET_ID } from '../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { hubPath, pagePath } from '../../../../../shared/paths.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import { store } from '../../../../../engine/store.js'
import { configureRecords } from '../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  getHandlerOf,
  openedFromChangeLink,
  postHandlerOf,
  withFlowOnlyAnswers
} from '../../../../../engine/test-support.js'
import { seedWithCommodityLineOfAnimals } from '../../../test-support.js'
import { dispatchPages } from './index.js'
import { withChangeContext } from '../../../../../shared/kit.js'

import * as commoditiesSearch from './commodities/search/search.controller.js'
import * as consignmentDetails from './commodities/consignment-details/consignment-details.controller.js'
import * as animalIdentification from './commodities/animal-identification/animal-identification.controller.js'
import * as documents from './documents/controller.js'
import { lineKey } from './commodities/search/selection/line-key.js'
import { STORED_SEARCH_ROWS } from './commodities/search/selection/rows.js'
import { FELIS_CATUS_ROW, lineOf } from './commodities/search/test-support.js'
import { driveReturnFromUpload } from './documents/test-support.js'

const change = { change: '1' }
const TEST_JOURNEY_ID = 'journey-1'
const IMPLICIT_SUBMIT = 'implicit-submit'

const lineSeed = {
  commodityLines: [lineOf(FELIS_CATUS_ROW)]
}

const savableLineCountPayload = { 'numberOfAnimalsQuantity-0': '1' }

beforeAll(() => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  buildDispatch(SET_ID, dispatchPages)
})
beforeEach(() => store.clear())

describe('change context — kit contracts', () => {
  it('Should append the change flag to an href only when the request carries change context', () => {
    expect(
      withChangeContext(
        { query: change },
        pagePath(TEST_JOURNEY_ID, 'commodities')
      )
    ).toBe(`${pagePath(TEST_JOURNEY_ID, 'commodities')}?change=1`)
    expect(
      withChangeContext({ query: {} }, pagePath(TEST_JOURNEY_ID, 'commodities'))
    ).toBe(pagePath(TEST_JOURNEY_ID, 'commodities'))
  })
})

describe('change context — context survives the internal loop navigation', () => {
  it('Should go on from the search save to Main import reason when the request carries change context', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(commoditiesSearch),
      {
        startingFrom: [
          withFlowOnlyAnswers({ [STORED_SEARCH_ROWS]: [FELIS_CATUS_ROW] }),
          openedFromChangeLink()
        ],
        payload: { species: [lineKey(FELIS_CATUS_ROW)] }
      }
    )
    expect(response).toEqual({
      redirect: pagePath(journeyId, 'import-reason')
    })
    expect(after.commodityLines).toEqual([
      expect.objectContaining(FELIS_CATUS_ROW)
    ])
  })

  it('Should carry the context and the return marker on the details page Add-another affordance', async () => {
    const { journeyId, view } = await driveHandler(
      getHandlerOf(consignmentDetails),
      { seed: lineSeed, startingFrom: [openedFromChangeLink()] }
    )
    const { addHref, groups } = view.context
    expect(addHref).toBe(
      `${pagePath(journeyId, 'commodities')}?return=consignment-details&change=1`
    )
    expect(groups[0].index).toBe(0)
  })

  it('Should carry the context to the commodity question when removing the last line', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(consignmentDetails),
      {
        payload: { action: `remove:${FELIS_CATUS_ROW.commodityCode}` },
        startingFrom: [openedFromChangeLink()],
        seed: lineSeed
      }
    )
    expect(response).toEqual({
      redirect: `${pagePath(journeyId, 'commodities')}?change=1`
    })
    expect(after.commodityLines ?? []).toHaveLength(0)
  })

  it('Should carry the context through an identifier Save-and-add-another PRG cycle for a two-animal line with the unit committed', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(animalIdentification),
      {
        payload: {
          action: 'add:0',
          'animalIdentifierPassport-0': 'UK123456789'
        },
        startingFrom: [openedFromChangeLink()],
        seed: seedWithCommodityLineOfAnimals(2)
      }
    )
    expect(response).toEqual({
      redirect: `${pagePath(journeyId, 'commodities/identification')}?change=1`
    })
    expect(
      after.commodityLines[0].animalIdentifiers[0].animalIdentifierPassport
    ).toBe('UK123456789')
  })

  it('Should carry the context through a documents upload-return cycle with the entry committed', async () => {
    const { journeyId, response, after } = await driveReturnFromUpload({
      startingFrom: [openedFromChangeLink()]
    })

    expect(response).toEqual({
      redirect: `${pagePath(journeyId, 'accompanying-documents')}?change=1`
    })
    expect(after.documents).toHaveLength(1)
  })

  it('Should carry the context through a documents remove round-trip', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(documents),
      {
        startingFrom: [openedFromChangeLink()],
        payload: { action: 'remove:0' },
        seed: { documents: [{ accompanyingDocumentReference: 'GBHC1' }] }
      }
    )
    expect(response).toEqual({
      redirect: `${pagePath(journeyId, 'accompanying-documents')}?change=1`
    })
    expect(after.documents ?? []).toHaveLength(0)
  })
})

describe('change context — Save and continue goes on to the next page that applies', () => {
  const withAndWithout = async (handler, options) => ({
    changed: await driveHandler(handler, {
      ...options,
      startingFrom: [openedFromChangeLink()]
    }),
    plain: await driveHandler(handler, options)
  })

  it.each([
    [
      'the consignment details save',
      consignmentDetails,
      { payload: savableLineCountPayload, seed: lineSeed },
      'commodities/identification'
    ],
    [
      'the identification Enter post with nothing typed',
      animalIdentification,
      { payload: { action: IMPLICIT_SUBMIT }, seed: lineSeed },
      'additional-details'
    ],
    ['the documents Continue', documents, {}, 'addresses']
  ])(
    'Should send %s to the same next page with or without change context',
    async (_name, feature, options, nextSlug) => {
      const { changed, plain } = await withAndWithout(
        postHandlerOf(feature),
        options
      )

      expect(changed.response).toEqual({
        redirect: pagePath(changed.journeyId, nextSlug)
      })
      expect(plain.response).toEqual({
        redirect: pagePath(plain.journeyId, nextSlug)
      })
    }
  )

  it('Should let an explicit hub exit win over the change context', async () => {
    const details = await driveHandler(postHandlerOf(consignmentDetails), {
      payload: { ...savableLineCountPayload, exit: 'hub' },
      startingFrom: [openedFromChangeLink()],
      seed: lineSeed
    })
    expect(details.response).toEqual({
      redirect: hubPath(details.journeyId)
    })

    const identifiers = await driveHandler(
      postHandlerOf(animalIdentification),
      {
        payload: { exit: 'hub', action: IMPLICIT_SUBMIT },
        startingFrom: [openedFromChangeLink()],
        seed: lineSeed
      }
    )
    expect(identifiers.response).toEqual({
      redirect: hubPath(identifiers.journeyId)
    })
  })
})
