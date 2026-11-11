import { describe, expect, it } from 'vitest'

import { leaves } from '../../../../../../../shared/copy-leaves.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'
import { ADDRESS_FIELDS } from '../cards.js'

describe('permanent-address copy module', () => {
  it('Should have a non-empty string (or string-returning function) at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      const text = typeof value === 'function' ? value('label', 'value') : value
      expect(typeof text, `${path} must resolve to a string`).toBe('string')
      expect(text.trim().length, `${path} must not be empty`).toBeGreaterThan(0)
    }
  })

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
})
