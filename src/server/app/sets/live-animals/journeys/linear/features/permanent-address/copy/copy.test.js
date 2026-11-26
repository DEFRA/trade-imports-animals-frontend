import { describe, expect, it } from 'vitest'

import { itHoldsCopyAtEveryLeaf } from '../../../../../../../engine/copy-test-support.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'
import { ADDRESS_FIELDS } from '../cards.js'

describe('permanent-address copy module', () => {
  itHoldsCopyAtEveryLeaf(copy, copyCy, ['label', 'value'])

  it('Should head the page "Permanent address" in English and Welsh', () => {
    expect(copy.title).toBe('Permanent address')
    expect(copyCy.title).toBe('Cyfeiriad parhaol')
  })

  it('Should warn that a false address is fraud', () => {
    expect(copy.warning).toBe('Providing a false address is an act of fraud')
  })

  it('Should ask to select an address once, as the card radio legend', () => {
    expect(copy.legend).toBe('Select an address')
  })

  it('Should offer the place-of-destination option and the new-address option with its 48-hour hint', () => {
    expect(copy.options.placeOfDestination).toBe(
      'Same as the place of destination (POD)'
    )
    expect(copy.options.newAddress).toBe('Enter a new address')
    expect(copy.options.newAddressHint).toBe(
      'This is where they will stay after spending 48 hours at the place of destination.'
    )
  })

  it('Should join an identifier label and its value with a colon', () => {
    expect(copy.identifierLine('Microchip', 'MICROCHIP-1')).toBe(
      'Microchip: MICROCHIP-1'
    )
  })

  it('Should carry a label for every address field and hint the phone field with the country code, in English and Welsh', () => {
    for (const field of ADDRESS_FIELDS) {
      expect(typeof copy.address[field], `${field} must have a label`).toBe(
        'string'
      )
      expect(
        typeof copyCy.address[field],
        `${field} must have a Welsh label`
      ).toBe('string')
    }
    expect(copy.addressHints.phone).toBe(
      'For international numbers include the country code'
    )
    expect(copyCy.addressHints.phone).toBe(
      'Ar gyfer rhifau rhyngwladol, cynhwyswch god y wlad'
    )
  })

  it('Should order the rendered address fields with email before phone', () => {
    expect(ADDRESS_FIELDS).toEqual([
      'nameOrOrganisationName',
      'addressLine1',
      'addressLine2',
      'townOrCity',
      'county',
      'postcode',
      'email',
      'phone'
    ])
  })

  it('Should require each of the six fields with the design source message, in English, with a non-empty Welsh counterpart', () => {
    const REQUIRED_FIELDS = [
      ['nameOrOrganisationName', 'Enter a name or organisation name'],
      ['addressLine1', 'Enter address line 1'],
      ['townOrCity', 'Enter a town or city'],
      ['postcode', 'Enter a postcode or Zip code'],
      ['email', 'Enter an email address'],
      ['phone', 'Enter a phone number']
    ]
    for (const [field, message] of REQUIRED_FIELDS) {
      expect(copy.errors[field]).toBe(message)
      expect(
        typeof copyCy.errors[field],
        `${field} must have a Welsh message`
      ).toBe('string')
      expect(
        copyCy.errors[field].length,
        `${field} must have a non-empty Welsh message`
      ).toBeGreaterThan(0)
    }
  })

  it('Should refuse a place-of-destination choice with no place of destination yet, in English, with a non-empty Welsh counterpart', () => {
    expect(copy.errors.placeOfDestinationUnknown).toBe(
      'Add a place of destination before you can continue'
    )
    expect(typeof copyCy.errors.placeOfDestinationUnknown).toBe('string')
    expect(copyCy.errors.placeOfDestinationUnknown.length).toBeGreaterThan(0)
  })

  it('Should show the no-animals-counted message in three parts naming consignment details, in English, with non-empty Welsh counterparts', () => {
    expect(copy.noAnimalsCounted.before).toBe('Add the number of animals on ')
    expect(copy.noAnimalsCounted.linkText).toBe('consignment details')
    expect(copy.noAnimalsCounted.after).toBe(' before you can continue.')
    for (const part of ['before', 'linkText', 'after']) {
      expect(typeof copyCy.noAnimalsCounted[part]).toBe('string')
      expect(copyCy.noAnimalsCounted[part].length).toBeGreaterThan(0)
    }
  })

  it('Should show the no-animals-identified message in three parts naming identification details, in English, with non-empty Welsh counterparts', () => {
    expect(copy.noAnimalsIdentified.before).toBe('Identify an animal on ')
    expect(copy.noAnimalsIdentified.linkText).toBe('identification details')
    expect(copy.noAnimalsIdentified.after).toBe(' before you can continue.')
    for (const part of ['before', 'linkText', 'after']) {
      expect(typeof copyCy.noAnimalsIdentified[part]).toBe('string')
      expect(copyCy.noAnimalsIdentified[part].length).toBeGreaterThan(0)
    }
  })

  it('Should join a field message and the animal title with "for"', () => {
    expect(copy.errors.forAnimal('Enter address line 1', 'Felis catus 1')).toBe(
      'Enter address line 1 for Felis catus 1'
    )
  })
})
