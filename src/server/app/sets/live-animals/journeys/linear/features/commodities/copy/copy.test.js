import { SET_ID } from '../../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import {
  identifiedCommodityCodes,
  identifiersFor
} from '../../../../../services/commodities/index.js'

import { leaves } from '../../../../../../../shared/copy-leaves.js'
import * as search from '../search/search.controller.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'
import { BOS_TAURUS } from '../search/test-support.js'

describe('#copy', () => {
  it.each([
    ['English', copy],
    ['Welsh', copyCy]
  ])(
    'Should have a non-empty string (or string-returning function) at every %s leaf',
    (_language, block) => {
      for (const { path, value } of leaves(block)) {
        const text =
          typeof value === 'function' ? value('sample', 2, 3, 4) : value
        expect(typeof text, `${path} must resolve to a string`).toBe('string')
        expect(text.trim().length, `${path} must not be empty`).toBeGreaterThan(
          0
        )
      }
    }
  )

  it('Should point the commodity-code lookup at the Trade Tariff tool', () => {
    expect(copy.search.help.lookupHref).toBe('https://www.gov.uk/trade-tariff')
    expect(copyCy.search.help.lookupHref).toBe(
      'https://www.gov.uk/trade-tariff'
    )
  })

  it('Should name the identification page without the word animal', () => {
    expect(copy.identification.title).toBe('Identification details')
    expect(copyCy.identification.title).toBe('Manylion adnabod')
  })

  it('Should label each identifier entry field with its saved-animals column heading', () => {
    for (const field of [
      'animalIdentifierPassport',
      'animalIdentifierTattoo',
      'animalIdentifierEarTag',
      'horseName'
    ]) {
      expect(copy.identification.typeFields[field].label).toBe(
        copy.identification.identifierLabels[field]
      )
      expect(copyCy.identification.typeFields[field].label).toBe(
        copyCy.identification.identifierLabels[field]
      )
    }
  })

  const expectLabelledIn = (block, commodityCode, identifier) => {
    const where = `${commodityCode} asks for ${identifier}`
    expect(block.identification.typeFields[identifier]?.label, where).toEqual(
      expect.any(String)
    )
    expect(block.identification.identifierLabels[identifier], where).toEqual(
      expect.any(String)
    )
  }

  it('Should carry an entry field and a column heading for every identifier a commodity code asks for', () => {
    const pairs = identifiedCommodityCodes().flatMap((commodityCode) =>
      identifiersFor(commodityCode).map((identifier) => [
        commodityCode,
        identifier
      ])
    )
    expect(
      pairs.length,
      'no commodity code carries any identifier'
    ).toBeGreaterThan(0)

    for (const [commodityCode, identifier] of pairs) {
      expectLabelledIn(copy, commodityCode, identifier)
      expectLabelledIn(copyCy, commodityCode, identifier)
    }
  })

  it('Should tell the user that a consignment without a health certificate must still be notified', () => {
    expect(copy.search.inset).toBe(
      'A separate notification is required for each health certificate. Consignments that do not require a health certificate must still be notified.'
    )
    expect(copyCy.search.inset).toContain(
      'Rhaid hysbysu llwythi nad oes angen tystysgrif iechyd arnynt o hyd.'
    )
  })

  it('Should interpolate countDrop', () => {
    expect(copy.consignmentDetails.errors.countDrop(3, BOS_TAURUS, 2)).toBe(
      'You have 3 identifier records for Bos taurus but entered 2 animals. Remove identifier records or keep the higher count.'
    )
    expect(
      copy.consignmentDetails.errors.countDrop(1, BOS_TAURUS, 1)
    ).toContain('1 identifier record for')
  })

  it('Should interpolate counter', () => {
    expect(copy.identification.counter(BOS_TAURUS, 2, 2)).toBe(
      'Enter details for Bos taurus 2 of 2'
    )
  })

  it('Should interpolate overCount', () => {
    expect(copy.identification.overCount(1, BOS_TAURUS, 2, 1)).toBe(
      'This commodity line lists 1 Bos taurus animals but you have entered details for 2. Remove 1 to continue.'
    )
  })

  it('Should head the identification summary with the code, the species and the animal count', () => {
    expect(copy.identification.summary).toMatchObject({
      caption: 'Selected commodities',
      commodityCode: 'Commodity code',
      species: 'Species',
      numberOfAnimals: 'Number of animals',
      change: 'Change'
    })
    expect(copy.identification.addAnotherCommodity).toBe(
      'Add another commodity'
    )
  })

  it('Should label the route back to the animal count without naming a species', () => {
    expect(copy.identification.changeAnimalCount).toBe(
      'Change number of animals'
    )
    expect(copyCy.identification.changeAnimalCount).toBe(
      'Newid nifer yr anifeiliaid'
    )
  })

  it('Should warn that a false permanent address is fraud and say APHA can check it', () => {
    expect(copy.identification.permanentAddress.warning).toBe(
      'Providing a false address is an act of fraud'
    )
    expect(copy.identification.permanentAddress.definitionLeadIn).toBe(
      'A permanent address is where an animal:'
    )
    expect(copy.identification.permanentAddress.definitionItems).toEqual([
      'will permanently reside',
      'can be checked by the Animal and Plant Health Agency (APHA)'
    ])
    expect(copy.identification.permanentAddress.question).toBe(
      'Where will their permanent address be?'
    )
    expect(copyCy.identification.permanentAddress.definitionItems[1]).toContain(
      'APHA'
    )
  })

  it('Should label the permanent address postcode and phone fields, hint the country code and name both fields the same way in their errors', () => {
    expect(copy.identification.address.postcode).toBe('Postcode or Zip code')
    expect(copy.identification.address.phone).toBe('Phone number')
    expect(copy.identification.addressHints.phone).toBe(
      'For international numbers include the country code'
    )
    expect(copyCy.identification.addressHints.phone).toBe(
      'Ar gyfer rhifau rhyngwladol, cynhwyswch god y wlad'
    )
    expect(copy.identification.errors.addressMandatory.phone).toBe(
      'Enter a phone number'
    )
    expect(copy.identification.errors.addressFormat.postcode).toBe(
      'Postcode or Zip code must be 12 characters or less'
    )
    expect(copy.identification.errors.addressMandatory.postcode).toBe(
      'Enter a postcode or Zip code'
    )
    expect(copy.identification.errors.addressFormat.phone).toBe(
      'Phone number must be 20 characters or less'
    )
  })

  it('Should interpolate capReached', () => {
    expect(copy.identification.errors.capReached(2)).toBe(
      'You have already entered details for all 2 animals — remove a record before adding another'
    )
  })
})

describe('GET commodities search — copy reaches the view', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should supply the page copy namespace and the shared chrome copy', async () => {
    const get = search.routes.find((route) => route.method === 'GET').handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy.search)
    expect(result.view.context.pageTitle).toBe(copy.search.title)
    expect(result.view.context.sharedCopy.saveActions.saveAndContinue).toBe(
      'Save and continue'
    )
  })
})
