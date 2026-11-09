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
  reviewChangeLinkQuery,
  postHandlerOf,
  withFlowOnlyAnswers
} from '../../../../../engine/test-support.js'
import {
  originSaved,
  requiredEarlierAnswers,
  seedFromFranceWithCommodityLineOfAnimals,
  withOriginSaved
} from '../../../test-support.js'
import { dispatchPages } from './index.js'
import { CYA_SLUG, withTrail } from '../../../../../shared/kit.js'

import * as commoditiesSearch from './commodities/search/search.controller.js'
import * as consignmentDetails from './commodities/consignment-details/consignment-details.controller.js'
import * as animalIdentification from './commodities/animal-identification/animal-identification.controller.js'
import * as documents from './documents/controller.js'
import { lineKey } from './commodities/search/selection/line-key.js'
import { STORED_SEARCH_ROWS } from './commodities/search/selection/rows.js'
import { FELIS_CATUS_ROW, lineOf } from './commodities/search/test-support.js'
import { driveReturnFromUpload } from './documents/test-support.js'

const IMPLICIT_SUBMIT = 'implicit-submit'
const IDENTIFICATION_SLUG = 'commodities/identification'
const DOCUMENTS_SLUG = 'accompanying-documents'

const lineSeed = withOriginSaved({
  commodityLines: [lineOf(FELIS_CATUS_ROW)]
})

const savableLineCountPayload = { 'numberOfAnimalsQuantity-0': '1' }

const fromReview = (path) => withTrail(path, [CYA_SLUG])

beforeAll(() => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  buildDispatch(SET_ID, dispatchPages)
})
beforeEach(() => store.clear())

describe('trail — the trail survives the internal loop navigation', () => {
  it('Should go on from the search save to Main import reason with the search page on the trail', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(commoditiesSearch),
      {
        startingFrom: [
          withFlowOnlyAnswers({ [STORED_SEARCH_ROWS]: [FELIS_CATUS_ROW] }),
          { query: reviewChangeLinkQuery() }
        ],
        seed: originSaved,
        payload: { species: [lineKey(FELIS_CATUS_ROW)] }
      }
    )
    expect(response).toEqual({
      redirect: withTrail(pagePath(journeyId, 'import-reason'), [
        CYA_SLUG,
        'commodities'
      ])
    })
    expect(after.commodityLines).toEqual([
      expect.objectContaining(FELIS_CATUS_ROW)
    ])
  })

  it('Should carry the trail and the return marker on the details page Add-another affordance', async () => {
    const { journeyId, view } = await driveHandler(
      getHandlerOf(consignmentDetails),
      { seed: lineSeed, startingFrom: [{ query: reviewChangeLinkQuery() }] }
    )
    const { addHref, groups } = view.context
    expect(addHref).toBe(
      `${pagePath(journeyId, 'commodities')}?return=consignment-details&from=${CYA_SLUG}`
    )
    expect(groups[0].index).toBe(0)
  })

  it('Should carry the trail to the commodity question when removing the last line', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(consignmentDetails),
      {
        payload: { action: `remove:${FELIS_CATUS_ROW.commodityCode}` },
        startingFrom: [{ query: reviewChangeLinkQuery() }],
        seed: lineSeed
      }
    )
    expect(response).toEqual({
      redirect: fromReview(pagePath(journeyId, 'commodities'))
    })
    expect(after.commodityLines ?? []).toHaveLength(0)
  })

  it('Should carry the trail through an identifier Save-and-add-another PRG cycle for a two-animal line with the unit committed', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(animalIdentification),
      {
        payload: {
          action: 'add:0',
          'animalIdentifierPassport-0': 'UK123456789'
        },
        startingFrom: [{ query: reviewChangeLinkQuery() }],
        seed: seedFromFranceWithCommodityLineOfAnimals(2)
      }
    )
    expect(response).toEqual({
      redirect: fromReview(pagePath(journeyId, IDENTIFICATION_SLUG))
    })
    expect(
      after.commodityLines[0].animalIdentifiers[0].animalIdentifierPassport
    ).toBe('UK123456789')
  })

  it('Should carry the trail through a documents upload-return cycle with the entry committed', async () => {
    const { journeyId, response, after } = await driveReturnFromUpload({
      startingFrom: [{ query: reviewChangeLinkQuery() }]
    })

    expect(response).toEqual({
      redirect: fromReview(pagePath(journeyId, DOCUMENTS_SLUG))
    })
    expect(after.documents).toHaveLength(1)
  })

  it('Should carry the trail through a documents remove round-trip', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(documents),
      {
        startingFrom: [{ query: reviewChangeLinkQuery() }],
        payload: { action: 'remove:0' },
        seed: { documents: [{ accompanyingDocumentReference: 'GBHC1' }] }
      }
    )
    expect(response).toEqual({
      redirect: fromReview(pagePath(journeyId, DOCUMENTS_SLUG))
    })
    expect(after.documents ?? []).toHaveLength(0)
  })
})

describe('trail — Save and continue goes on to the next page that applies', () => {
  const withAndWithout = async (handler, options) => ({
    fromReviewLink: await driveHandler(handler, {
      ...options,
      startingFrom: [{ query: reviewChangeLinkQuery() }]
    }),
    withoutTrail: await driveHandler(handler, options)
  })

  it.each([
    [
      'the consignment details save',
      consignmentDetails,
      { payload: savableLineCountPayload, seed: lineSeed },
      IDENTIFICATION_SLUG,
      'consignment-details'
    ],
    [
      'the identification Enter post with nothing typed',
      animalIdentification,
      { payload: { action: IMPLICIT_SUBMIT }, seed: lineSeed },
      'additional-details',
      IDENTIFICATION_SLUG
    ],
    [
      'the documents Continue',
      documents,
      { seed: requiredEarlierAnswers() },
      'addresses',
      DOCUMENTS_SLUG
    ]
  ])(
    'Should send %s to the same next page whatever the trail, adding this page to it',
    async (_name, feature, options, nextSlug, savedSlug) => {
      const { fromReviewLink, withoutTrail } = await withAndWithout(
        postHandlerOf(feature),
        options
      )

      expect(fromReviewLink.response).toEqual({
        redirect: withTrail(pagePath(fromReviewLink.journeyId, nextSlug), [
          CYA_SLUG,
          savedSlug
        ])
      })
      expect(withoutTrail.response).toEqual({
        redirect: withTrail(pagePath(withoutTrail.journeyId, nextSlug), [
          savedSlug
        ])
      })
    }
  )

  it('Should let an explicit hub exit win over the trail', async () => {
    const details = await driveHandler(postHandlerOf(consignmentDetails), {
      payload: { ...savableLineCountPayload, exit: 'hub' },
      startingFrom: [{ query: reviewChangeLinkQuery() }],
      seed: lineSeed
    })
    expect(details.response).toEqual({
      redirect: hubPath(details.journeyId)
    })

    const identifiers = await driveHandler(
      postHandlerOf(animalIdentification),
      {
        payload: { exit: 'hub', action: IMPLICIT_SUBMIT },
        startingFrom: [{ query: reviewChangeLinkQuery() }],
        seed: lineSeed
      }
    )
    expect(identifiers.response).toEqual({
      redirect: hubPath(identifiers.journeyId)
    })
  })
})
