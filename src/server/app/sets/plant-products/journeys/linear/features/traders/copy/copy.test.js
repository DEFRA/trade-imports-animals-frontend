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

const leaves = (value, path = []) =>
  Object.entries(value).flatMap(([key, child]) =>
    child !== null && typeof child === 'object'
      ? leaves(child, [...path, key])
      : [{ path: [...path, key].join('.'), value: child }]
  )

const resolveCopyString = (value) =>
  typeof value === 'function' ? value(1, 2) : value

describe('plant-products traders copy', () => {
  it('keeps English and Welsh structure-identical', () => {
    expect(shape(cy)).toEqual(shape(en))
  })

  it('provides non-empty copy at every leaf in both locales', () => {
    for (const bundle of [en, cy]) {
      for (const { path, value } of leaves(bundle)) {
        const text = resolveCopyString(value)
        expect(text, `${path} must resolve to a string`).toEqual(
          expect.any(String)
        )
        expect(text.trim(), `${path} must not be empty`).not.toBe('')
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

  it('provides the complete consignor-picker English contract', () => {
    const { resultsCaption, ...fixed } = en.consignorPicker

    expect(fixed).toEqual({
      pageTitle: 'Consignor or exporter',
      caption: 'Traders',
      description:
        'Select the consignor or exporter for this notification, or add a new one.',
      noSaved: 'You have not saved any consignors or exporters yet.',
      noMatches: 'No consignors or exporters match your search.',
      search: {
        label: 'Search',
        hint: 'Name, address or country',
        button: 'Search'
      },
      table: {
        selectHidden: 'Select',
        name: 'Name',
        address: 'Address',
        country: 'Country',
        actionsHidden: 'Actions'
      },
      selectRowPrefix: 'Select',
      viewDetails: 'View details',
      viewDetailsFor: 'for',
      selectedPrefix: 'Selected consignor or exporter:',
      errorPrefix: 'Error:',
      saveAndContinue: 'Save and continue',
      addNew: 'Add a consignor or exporter',
      errors: { required: 'Select a consignor or exporter from the list' }
    })
    expect(resultsCaption(5, 12)).toBe(
      'Showing 5 of 12 consignors or exporters'
    )
  })

  it('gives the picker button and the traders-addresses entry link the same wording', () => {
    expect(en.consignorPicker.addNew).toBe(
      en.tradersAddresses.consignor.addLink
    )
    expect(cy.consignorPicker.addNew).toBe(
      cy.tradersAddresses.consignor.addLink
    )
  })

  it('keeps both interpolations in the Welsh results caption', () => {
    expect(cy.consignorPicker.resultsCaption(5, 12)).toContain('5')
    expect(cy.consignorPicker.resultsCaption(5, 12)).toContain('12')
  })

  it('translates the search and no-matches copy and keeps it distinct from the nothing-saved line', () => {
    for (const [english, welsh] of [
      [en.consignorPicker.search.label, cy.consignorPicker.search.label],
      [en.consignorPicker.search.hint, cy.consignorPicker.search.hint],
      [en.consignorPicker.search.button, cy.consignorPicker.search.button],
      [en.consignorPicker.noMatches, cy.consignorPicker.noMatches]
    ]) {
      expect(welsh).not.toBe(english)
    }

    for (const bundle of [en, cy]) {
      expect(bundle.consignorPicker.noMatches).not.toBe(
        bundle.consignorPicker.noSaved
      )
    }
  })
})
