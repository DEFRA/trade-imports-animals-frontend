import { SET_ID } from '../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { hubPath, pagePath } from '../../../../../shared/paths.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import {
  amendmentOpened,
  driveHandler,
  getHandlerOf,
  reviewChangeLinkQuery,
  postHandlerOf
} from '../../../../../engine/test-support.js'
import { store } from '../../../../../engine/store.js'
import { configureRecords } from '../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../services/persistence/session/stub.js'
import { recordsHoldingRole } from '../../../../../services/address-book/stub/test-support.js'
import { seedFromFranceWithCommodityLineOfAnimals } from '../../../test-support.js'
import { dispatchPages } from './index.js'
import {
  base,
  CYA_SLUG,
  hubExitTarget,
  withTrail
} from '../../../../../shared/kit.js'

import * as importReason from './import-reason/controller.js'
import * as consignmentDetails from './commodities/consignment-details/consignment-details.controller.js'
import * as animalIdentification from './commodities/animal-identification/animal-identification.controller.js'
import * as documents from './documents/controller.js'
import * as cphNumber from './cph-number/controller.js'
import * as contact from './contact/controller.js'
import { copy } from './contact/copy/copy.en.js'
import { HELD_CONTACT } from './contact/test-support.js'
import { CONTACT_PARTY } from './addresses/parties.js'
import {
  BOS_TAURUS_ROW,
  FELIS_CATUS_ROW
} from './commodities/search/test-support.js'

const CONSIGNMENT_DETAILS_SLUG = 'consignment-details'
const detailsAfterImportReason = (journeyId, ...trailBeforeImportReason) =>
  withTrail(pagePath(journeyId, CONSIGNMENT_DETAILS_SLUG), [
    ...trailBeforeImportReason,
    'import-reason'
  ])

const reasonPrerequisites = {
  countryOfOrigin: 'FR',
  commodityLines: [FELIS_CATUS_ROW]
}
const internalMarketPayload = {
  reasonForImport: 'internalMarket',
  purposeInInternalMarket: 'breeding'
}

beforeAll(() => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  buildDispatch(SET_ID, dispatchPages)
})
beforeEach(() => store.clear())

describe('save actions — hub exit semantics', () => {
  it('Should expose the hub href for the cancel link from kit.base', () => {
    expect(
      base('Any page', { journey: { journeyId: 'journey-1' } }).hubHref
    ).toBe(hubPath('journey-1'))
  })

  it('Should resolve the hub target only for the named exit submit', () => {
    expect(
      hubExitTarget({
        payload: { exit: 'hub' },
        params: { journeyId: 'journey-1' }
      })
    ).toBe(hubPath('journey-1'))
    expect(
      hubExitTarget({ payload: {}, params: { journeyId: 'journey-1' } })
    ).toBeNull()
    expect(hubExitTarget({ params: { journeyId: 'journey-1' } })).toBeNull()
  })

  it('Should commit the page and redirect to the hub on Save and return to overview', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(importReason),
      {
        payload: { ...internalMarketPayload, exit: 'hub' },
        seed: reasonPrerequisites
      }
    )
    expect(response).toEqual({ redirect: hubPath(journeyId) })
    expect(after.purposeInInternalMarket).toBe('breeding')
  })

  it('Should send Save and continue on to Commodity details when no exit is named', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(importReason),
      {
        payload: internalMarketPayload,
        seed: reasonPrerequisites
      }
    )
    expect(response).toEqual({
      redirect: detailsAfterImportReason(journeyId)
    })
    expect(after.purposeInInternalMarket).toBe('breeding')
  })

  it('Should reject an invalid Save and return to overview with the same errors as Save and continue', async () => {
    const invalid = {
      reasonForImport: 'internalMarket',
      purposeInInternalMarket: 'not-a-purpose'
    }
    const plain = await driveHandler(postHandlerOf(importReason), {
      payload: invalid
    })
    const exit = await driveHandler(postHandlerOf(importReason), {
      payload: { ...invalid, exit: 'hub' }
    })
    expect(plain.response.redirect).toBeUndefined()
    expect(exit.response.redirect).toBeUndefined()
    expect(exit.view.view).toBe(plain.view.view)
    expect(exit.view.context.errors).toEqual(plain.view.context.errors)
    expect(exit.view.context.errors.purposeInInternalMarket).toBeDefined()
    expect(exit.after.purposeInInternalMarket).toBeUndefined()
  })

  it('Should refuse Save and return to overview with a required answer blank, with the same errors as Save and continue', async () => {
    const blankTransit = {
      reasonForImport: 'transit',
      transitPortOfExit: '',
      transitDestinationCountry: ''
    }
    const plain = await driveHandler(postHandlerOf(importReason), {
      payload: blankTransit,
      seed: reasonPrerequisites
    })
    const exit = await driveHandler(postHandlerOf(importReason), {
      payload: { ...blankTransit, exit: 'hub' },
      seed: reasonPrerequisites
    })
    expect(exit.response.redirect).toBeUndefined()
    expect(exit.view.context.errors).toEqual(plain.view.context.errors)
    expect(Object.keys(exit.view.context.errors)).toEqual([
      'transitPortOfExit',
      'transitDestinationCountry'
    ])
    expect(exit.after.reasonForImport).toBeUndefined()
  })

  it('Should send a Save and continue from a Change link on to Commodity details, carrying the trail', async () => {
    const { journeyId, response } = await driveHandler(
      postHandlerOf(importReason),
      {
        payload: internalMarketPayload,
        startingFrom: [{ query: reviewChangeLinkQuery() }],
        seed: reasonPrerequisites
      }
    )
    expect(response).toEqual({
      redirect: detailsAfterImportReason(journeyId, CYA_SLUG)
    })
  })

  it('Should let an explicit hub exit win over the trail', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(importReason),
      {
        payload: { ...internalMarketPayload, exit: 'hub' },
        startingFrom: [{ query: reviewChangeLinkQuery() }],
        seed: reasonPrerequisites
      }
    )
    expect(response).toEqual({ redirect: hubPath(journeyId) })
    expect(after.purposeInInternalMarket).toBe('breeding')
  })

  it('Should commit the consolidated details page and redirect to the hub on the exit submit', async () => {
    const seed = { commodityLines: [FELIS_CATUS_ROW] }
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(consignmentDetails),
      {
        payload: { 'numberOfAnimalsQuantity-0': '2', exit: 'hub' },
        seed
      }
    )
    expect(response).toEqual({ redirect: hubPath(journeyId) })
    expect(after.commodityLines[0].numberOfAnimalsQuantity).toBe(2)
  })

  it('Should commit a depth-2 identifier unit and redirect to the hub on the exit submit for a one-animal line', async () => {
    const { journeyId, response, after } = await driveHandler(
      postHandlerOf(animalIdentification),
      {
        payload: { 'animalIdentifierPassport-0': 'UK123456789', exit: 'hub' },
        seed: seedFromFranceWithCommodityLineOfAnimals(1)
      }
    )
    expect(response).toEqual({ redirect: hubPath(journeyId) })
    expect(after.commodityLines[0].animalIdentifiers).toHaveLength(1)
    expect(
      after.commodityLines[0].animalIdentifiers[0].animalIdentifierPassport
    ).toBe('UK123456789')
  })

  it('Should exit a multi-button loop page to the hub without disturbing its own actions', async () => {
    const exit = await driveHandler(postHandlerOf(documents), {
      payload: { exit: 'hub' }
    })
    expect(exit.response).toEqual({ redirect: hubPath(exit.journeyId) })

    const removal = await driveHandler(postHandlerOf(documents), {
      payload: { action: 'remove:1' },
      seed: {
        documents: [
          { accompanyingDocumentReference: 'GBHC1111111111' },
          { accompanyingDocumentReference: 'GBHC2222222222' }
        ]
      }
    })
    expect(removal.response).toEqual({
      redirect: pagePath(removal.journeyId, 'accompanying-documents')
    })
    expect(
      removal.after.documents.map(
        ({ accompanyingDocumentReference }) => accompanyingDocumentReference
      )
    ).toEqual(['GBHC1111111111'])
  })

  it('Should return to the consignment addresses page from both posts, because the page offers no overview-return control', async () => {
    const cphInScope = {
      countryOfOrigin: 'FR',
      commodityLines: [BOS_TAURUS_ROW]
    }
    const cphParts = { cphCounty: '12', cphParish: '345', cphHolding: '6789' }
    const saved = await driveHandler(postHandlerOf(cphNumber), {
      payload: cphParts,
      seed: cphInScope
    })
    expect(saved.response).toEqual({
      redirect: pagePath(saved.journeyId, 'addresses')
    })

    const posingAsHubExit = await driveHandler(postHandlerOf(cphNumber), {
      payload: { ...cphParts, exit: 'hub' },
      seed: cphInScope
    })
    expect(posingAsHubExit.response).toEqual({
      redirect: pagePath(posingAsHubExit.journeyId, 'addresses')
    })
    expect(posingAsHubExit.after.countyParishHoldingCph).toBe('123456789')
  })
})

describe('save actions — hub exit semantics — contact address', () => {
  it('Should refuse both save controls with the same errors when nothing is chosen, leaving a held contact address as it was', async () => {
    const plain = await driveHandler(postHandlerOf(contact), {
      seed: { contactAddress: HELD_CONTACT },
      payload: {}
    })
    const exit = await driveHandler(postHandlerOf(contact), {
      seed: { contactAddress: HELD_CONTACT },
      payload: { exit: 'hub' }
    })

    expect(plain.response.redirect).toBeUndefined()
    expect(exit.response.redirect).toBeUndefined()
    expect(exit.view.context.errors).toEqual(plain.view.context.errors)
    expect(exit.view.context.errors.contactAddress).toBeDefined()
    expect(plain.after.contactAddress).toEqual(HELD_CONTACT)
    expect(exit.after.contactAddress).toEqual(HELD_CONTACT)
  })

  it('Should save a chosen address from either save control, each reaching its own destination', async () => {
    const [chosen] = recordsHoldingRole(CONTACT_PARTY.addressBookRole)

    const continuing = await driveHandler(postHandlerOf(contact), {
      payload: { contactAddress: chosen.id }
    })
    const exiting = await driveHandler(postHandlerOf(contact), {
      payload: { contactAddress: chosen.id, exit: 'hub' }
    })

    expect(continuing.response).toEqual({
      redirect: withTrail(pagePath(continuing.journeyId, CYA_SLUG), [
        contact.meta.slug
      ])
    })
    expect(exiting.response).toEqual({ redirect: hubPath(exiting.journeyId) })
    expect(continuing.after.contactAddress).toMatchObject({
      pickedFromId: chosen.id,
      name: chosen.name
    })
    expect(exiting.after.contactAddress).toMatchObject({
      pickedFromId: chosen.id,
      name: chosen.name
    })

    const returning = await driveHandler(getHandlerOf(contact), {
      seed: exiting.after
    })
    expect(returning.view.context.errorSummary).toBeNull()
    expect(
      returning.view.context.contactOptions
        .filter((option) => option.checked)
        .map(({ value }) => value)
    ).toEqual([chosen.id])
  })
})

const postAmending = (startingFrom, { payload = internalMarketPayload } = {}) =>
  driveHandler(postHandlerOf(importReason), {
    seed: reasonPrerequisites,
    payload,
    startingFrom: [amendmentOpened(), ...startingFrom]
  })

describe('save actions — while amending', () => {
  it('Should send Save and continue on to the next page that applies, from a Change link or not', async () => {
    const fromChangeLink = await postAmending([
      { query: reviewChangeLinkQuery() }
    ])
    const fromOverview = await postAmending([])

    expect(fromChangeLink.response).toEqual({
      redirect: detailsAfterImportReason(fromChangeLink.journeyId, CYA_SLUG)
    })
    expect(fromOverview.response).toEqual({
      redirect: detailsAfterImportReason(fromOverview.journeyId)
    })
  })

  it.each([
    ['Save and continue', {}],
    ['Save and return to overview', { exit: 'hub' }]
  ])(
    "Should hold %s to the page's own checks, with the same errors and no commit as outside the amendment",
    async (_button, buttonPayload) => {
      const partlyAnsweredTransit = {
        reasonForImport: 'transit',
        transitPortOfExit: 'GB DVR',
        transitDestinationCountry: '',
        ...buttonPayload
      }
      const amending = await postAmending(
        [{ query: reviewChangeLinkQuery() }],
        {
          payload: partlyAnsweredTransit
        }
      )
      const outside = await driveHandler(postHandlerOf(importReason), {
        payload: partlyAnsweredTransit,
        seed: reasonPrerequisites
      })

      expect(amending.response.redirect).toBeUndefined()
      expect(amending.view.context.errors).toEqual(outside.view.context.errors)
      expect(amending.after).toEqual(amending.before)
    }
  )

  it.each([
    ['Save and continue', {}],
    ['Save and return to hub', { exit: 'hub' }]
  ])(
    "Should hold %s on the contact address page to its own check while amending, re-offering the organisation's addresses with none chosen",
    async (_button, buttonPayload) => {
      const amending = await driveHandler(postHandlerOf(contact), {
        seed: { contactAddress: HELD_CONTACT },
        payload: buttonPayload,
        startingFrom: [amendmentOpened()]
      })
      const outside = await driveHandler(postHandlerOf(contact), {
        seed: { contactAddress: HELD_CONTACT },
        payload: buttonPayload
      })

      expect(amending.response.redirect).toBeUndefined()
      expect(amending.view.context.errors).toEqual(outside.view.context.errors)
      expect(amending.view.context.errors.contactAddress).toBe(
        copy.errors.contactRequired
      )
      expect(amending.view.context.errorSummary.errorList[0].text).toBe(
        copy.errors.contactRequired
      )
      expect(amending.after).toEqual(amending.before)
      expect(
        amending.view.context.contactOptions.every((option) => !option.checked)
      ).toBe(true)
      expect(amending.view.context.contactOptions.length).toBeGreaterThan(0)
    }
  )
})
