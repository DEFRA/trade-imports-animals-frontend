import { describe, expect, it } from 'vitest'

import { copy as cy } from './copy.cy.js'
import { copy as en } from './copy.en.js'

const shape = (value) =>
  Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      child !== null && typeof child === 'object' ? shape(child) : typeof child
    ])
  )

const leaves = (value) =>
  Object.values(value).flatMap((child) =>
    child !== null && typeof child === 'object' ? leaves(child) : [child]
  )

describe('plant-products traders copy', () => {
  it('keeps English and Welsh structure-identical', () => {
    expect(shape(cy)).toEqual(shape(en))
  })

  it('provides non-empty copy at every leaf in both locales', () => {
    for (const bundle of [en, cy]) {
      for (const value of leaves(bundle)) {
        expect(value).toEqual(expect.any(String))
        expect(value.trim()).not.toBe('')
      }
    }
  })

  it('names the importer honestly in the delivery question and error', () => {
    expect(en.tradersAddresses.delivery.legend).toContain("importer's address")
    expect(en.tradersAddresses.errors.destinationSameAsConsignee).toContain(
      "importer's address"
    )
  })

  it('provides the complete consignor-create and confirmation English contract', () => {
    expect(en.consignorCreate).toMatchObject({
      heading: 'Add consignor or exporter',
      legend: 'Consignor or exporter',
      fields: {
        consignorAddressLine2: { label: 'Address line 2 (optional)' },
        consignorAddressLine3: { label: 'Address line 3 (optional)' },
        consignorPostcode: { label: 'Postcode or ZIP code (optional)' },
        consignorCountry: { placeholder: 'Please select your country' }
      },
      errors: {
        consignorPostcode: {
          max: 'Postcode or ZIP code must be 32 characters or fewer'
        },
        consignorTelephone: { required: 'Enter a telephone number' }
      },
      continueLabel: 'Save and continue'
    })
    expect(en.consignorConfirmation).toEqual({
      pageTitle: 'The consignor or exporter has been created',
      panelTitle: 'The consignor or exporter has been created',
      continueLabel: 'Add to notification'
    })
  })
})
