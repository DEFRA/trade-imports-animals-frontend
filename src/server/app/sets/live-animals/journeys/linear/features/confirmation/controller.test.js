import { SET_ID } from '../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  createPath,
  dashboardPath,
  pagePath
} from '../../../../../../shared/paths.js'
import { buildDispatch } from '../../../../../../flow/dispatch.js'
import {
  AMEND,
  DRAFT,
  configureRecords
} from '../../../../../../engine/persistence/records.js'
import { store } from '../../../../../../engine/store.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  amendmentOpened,
  authenticatedCredentials,
  driveHandler,
  itahcAnswers,
  expectOneLogged,
  journeyRequest,
  stubH
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import { declarationPage } from '../declaration/page.js'

import {
  BOS_TAURUS_ROW,
  GALLUS_GALLUS_ROW,
  SUS_SCROFA_DOMESTICUS_ROW,
  lineOf
} from '../commodities/search/test-support.js'
import { blankValuesFor } from '../commodities/animal-identification/identifier/fields.js'
import {
  cattleLine,
  seedFromFranceWithCattle,
  seedFromFranceWithOneEarTaggedCattle,
  withOriginSaved
} from '../../../../test-support.js'

import * as confirmation from './controller.js'
import { copy } from './copy/copy.en.js'

const get = confirmation.routes.find((route) => route.method === 'GET').handler

const DOCUMENT = {
  accompanyingDocumentType: 'VETERINARY_HEALTH_CERTIFICATE',
  accompanyingDocumentAttachmentType: 'PDF',
  accompanyingDocumentReference: 'GBHC1234567890',
  accompanyingDocumentDateOfIssue: { day: '12', month: '12', year: '2025' }
}

const submittedView = async (seed) => {
  const { journeyId } = await store.create()
  if (seed) {
    await store.seedAnswers(journeyId, seed)
  }
  await store.submit(journeyId)
  const h = stubH()
  await get(journeyRequest(journeyId), h)
  return { journeyId, view: h.captured.view }
}

describe('GET /confirmation', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should render the confirmation panel with the reference for a submitted notification', async () => {
    const { journeyId, view } = await submittedView()

    expect(view.context.pageTitle).toBe('Import notification submitted')
    expect(view.context.referenceNumber).toBe(journeyId)
  })

  it('Should not supply a submission date to the submitted page', async () => {
    const { view } = await submittedView()

    expect(view.context).not.toHaveProperty('submissionDate')
  })

  it('Should list the outstanding documents when nothing has been uploaded', async () => {
    const { view } = await submittedView()

    expect(view.context.outstandingItems).toEqual([copy.outstanding.documents])
  })

  it('Should list the outstanding documents when only a veterinary health certificate has been uploaded', async () => {
    const { view } = await submittedView({ documents: [DOCUMENT] })

    expect(view.context.outstandingItems).toEqual([copy.outstanding.documents])
  })

  it('Should list nothing outstanding when an ITAHC has been uploaded and no commodity line is recorded', async () => {
    const { view } = await submittedView({
      ...itahcAnswers()
    })

    expect(view.context.outstandingItems).toEqual([])
  })

  it('Should list the identifier item after the certificate item when a line holds fewer identified animals than it declares', async () => {
    const { view } = await submittedView(
      seedFromFranceWithCattle({ animals: 2, earTags: 1 })
    )

    expect(view.context.outstandingItems).toEqual([
      copy.outstanding.documents,
      copy.outstanding.completeIdentifiers
    ])
  })

  it('Should list the identifier item when a line declaring 2 animals holds one identified record and one blank record', async () => {
    const { view } = await submittedView(
      withOriginSaved({
        commodityLines: [
          lineOf(BOS_TAURUS_ROW, {
            numberOfAnimalsQuantity: '2',
            animalIdentifiers: [
              { animalIdentifierEarTag: 'UK1' },
              blankValuesFor(
                BOS_TAURUS_ROW.commodityCode,
                BOS_TAURUS_ROW.speciesLatinName
              )
            ]
          })
        ]
      })
    )

    expect(view.context.outstandingItems).toEqual([
      copy.outstanding.documents,
      copy.outstanding.completeIdentifiers
    ])
  })

  it('Should list the identifier item when a single-animal line has no identifier saved', async () => {
    const { view } = await submittedView(
      seedFromFranceWithCattle({ animals: 1, earTags: 0 })
    )

    expect(view.context.outstandingItems).toEqual([
      copy.outstanding.documents,
      copy.outstanding.completeIdentifiers
    ])
  })

  it('Should list the identifier item when only a later line is short of identified animals', async () => {
    const { view } = await submittedView(
      withOriginSaved({
        commodityLines: [
          cattleLine({ animals: 1, earTags: 1 }),
          lineOf(SUS_SCROFA_DOMESTICUS_ROW, {
            numberOfAnimalsQuantity: '3',
            animalIdentifiers: [{ animalIdentifierEarTag: 'UK9' }]
          })
        ]
      })
    )

    expect(view.context.outstandingItems).toEqual([
      copy.outstanding.documents,
      copy.outstanding.completeIdentifiers
    ])
  })

  it('Should list only the certificate item when every declared animal is identified', async () => {
    const { view } = await submittedView(seedFromFranceWithOneEarTaggedCattle())

    expect(view.context.outstandingItems).toEqual([copy.outstanding.documents])
  })

  it('Should list only the certificate item for a line whose species is not asked for identifiers', async () => {
    const { view } = await submittedView(
      withOriginSaved({
        commodityLines: [
          lineOf(GALLUS_GALLUS_ROW, { numberOfAnimalsQuantity: '2' })
        ]
      })
    )

    expect(view.context.outstandingItems).toEqual([copy.outstanding.documents])
  })

  it('Should list only the identifier item when an ITAHC has been uploaded and a line is short of identified animals', async () => {
    const { view } = await submittedView({
      ...seedFromFranceWithCattle({ animals: 2, earTags: 0 }),
      ...itahcAnswers()
    })

    expect(view.context.outstandingItems).toEqual([
      copy.outstanding.completeIdentifiers
    ])
  })

  it('Should supply the create-a-notification action alongside the dashboard link', async () => {
    const { view } = await submittedView()

    expect(view.context.dashboardHref).toBe(dashboardPath())
    expect(view.context.createAction).toBe(createPath())
  })

  it.each([
    { notification: 'a draft', startingFrom: [], status: DRAFT },
    {
      notification: 'an amendment',
      startingFrom: [amendmentOpened()],
      status: AMEND
    }
  ])(
    'Should redirect $notification to its declaration and log the refusal',
    async ({ startingFrom, status }) => {
      const { journeyId, response, logger } = await driveHandler(get, {
        startingFrom
      })

      expect(response).toEqual({
        redirect: pagePath(journeyId, declarationPage.slug)
      })
      expectOneLogged(logger, {
        level: 'info',
        fields: {
          journeyId,
          status,
          organisationId: authenticatedCredentials.organisationId,
          refusal: 'not-submitted'
        },
        message: 'Confirmation refused'
      })
    }
  )
})
