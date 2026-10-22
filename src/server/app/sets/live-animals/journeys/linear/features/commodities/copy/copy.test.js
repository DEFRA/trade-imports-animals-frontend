import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import { leaves } from '../../../../../../../shared/copy-leaves.js'
import {
  driveHandler,
  sampleText,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import {
  list,
  identifiersFor
} from '../../../../../services/commodities/index.js'

import * as search from '../search/search.controller.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

const BOS_TAURUS = 'Bos taurus'

const IDENTIFIERS_LABELLED_AS_COLUMN_HEADING = [
  'animalIdentifierPassport',
  'animalIdentifierTattoo',
  'animalIdentifierEarTag',
  'horseName'
]

describe('#copy', () => {
  it('Should have a non-empty string (or string-returning function) at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      const text = sampleText(value, ['sample', 2, 3, 4])
      expect(typeof text, `${path} must resolve to a string`).toBe('string')
      expect(text.trim().length, `${path} must not be empty`).toBeGreaterThan(0)
    }
  })

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
    for (const field of IDENTIFIERS_LABELLED_AS_COLUMN_HEADING) {
      expect(copy.identification.typeFields[field].label).toBe(
        copy.identification.identifierLabels[field]
      )
      expect(copyCy.identification.typeFields[field].label).toBe(
        copyCy.identification.identifierLabels[field]
      )
    }
  })

  const expectLabelledIn = (block, commodity, identifier) => {
    const where = `${commodity} asks for ${identifier}`
    expect(block.identification.typeFields[identifier]?.label, where).toEqual(
      expect.any(String)
    )
    expect(block.identification.identifierLabels[identifier], where).toEqual(
      expect.any(String)
    )
  }

  it('Should carry an entry field and a column heading for every identifier a commodity asks for', () => {
    const pairs = list().flatMap((commodity) =>
      identifiersFor(commodity).map((identifier) => [commodity, identifier])
    )
    expect(pairs.length, 'no commodity carries any identifier').toBeGreaterThan(
      0
    )

    for (const [commodity, identifier] of pairs) {
      expectLabelledIn(copy, commodity, identifier)
      expectLabelledIn(copyCy, commodity, identifier)
    }
  })

  it('Should tell the user to submit one notification per ITAHC and one for goods that need none', () => {
    expect(copy.search.inset).toBe(
      'You must submit a separate notification for every single ITAHC. You must also submit a notification for goods that do not need an ITAHC.'
    )
    expect(copyCy.search.inset).toBe(
      'Rhaid i chi gyflwyno hysbysiad ar wahân ar gyfer pob ITAHC unigol. Rhaid i chi hefyd gyflwyno hysbysiad ar gyfer nwyddau nad oes angen ITAHC arnynt.'
    )
  })

  it('Should hint searching by common name, commodity code or Latin name', () => {
    expect(copy.search.searchHint).toBe(
      'You can search by common name (for example, cattle), commodity code (0102), or Latin name (Bos taurus).'
    )
    expect(copyCy.search.searchHint).toBe(
      'Gallwch chwilio yn ôl enw cyffredin (er enghraifft, gwartheg), cod nwyddau (0102), neu enw Lladin (Bos taurus).'
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

  it('Should head the identification summary with the code, the common name and the animal count', () => {
    expect(copy.identification.summary).toMatchObject({
      caption: 'Selected commodities',
      commodityCode: 'Commodity code',
      commonName: 'Common name',
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
  useStubbedJourney(SET_ID, dispatchPages)

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
