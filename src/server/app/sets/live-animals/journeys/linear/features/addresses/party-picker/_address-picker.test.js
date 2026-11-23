import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../../../../../../../config/nunjucks/nunjucks.js'
import { documentOf } from '../../../../../../../../common/test-helpers/document-of.js'
import { copy as sharedEn } from '../../../../../../../shared/copy.en.js'
import { copy as addressesCopy } from '../copy/copy.en.js'
import { pickerRow } from './test-support.js'
import { pickerTableRows } from './view-model/table-rows.js'

const environment = nunjucksConfig.options.compileOptions.environment
const pickerCopy = addressesCopy.picker
const FORM_GROUP_SELECTOR = '.govuk-form-group'

const renderResults = (
  rows,
  { error, query, withViewLinks = true, pagination } = {}
) =>
  environment.renderString(
    `{% from "live-animals/journeys/linear/features/addresses/party-picker/_address-picker.njk" import addressPickerResults %}
     {{ addressPickerResults(picker, copy) }}`,
    {
      picker: {
        rows,
        withViewLinks,
        tableRows: pickerTableRows(rows, pickerCopy, { withViewLinks }),
        error,
        query,
        pagination,
        resultsCount: pickerCopy.resultsCount(rows.length, rows.length)
      },
      copy: pickerCopy
    }
  )

const pickerShowing = (overrides = {}) => ({
  rows: [row],
  query: '',
  page: 1,
  tableRows: pickerTableRows([row], pickerCopy, { withViewLinks: true }),
  resultsCount: pickerCopy.resultsCount(1, 1),
  ...overrides
})

const renderPicker = (picker = { rows: [], query: '', page: 1 }) =>
  environment.renderString(
    `{% from "live-animals/journeys/linear/features/addresses/party-picker/_address-picker.njk" import addressPicker %}
     {{ addressPicker(picker, crumb, copy, saveActionsCopy, hubHref) }}`,
    {
      picker,
      crumb: 'test-crumb',
      copy: pickerCopy,
      saveActionsCopy: sharedEn.saveActions,
      hubHref: '/notifications/journey-1/hub'
    }
  )

const row = pickerRow()

describe('addressPickerResults macro', () => {
  it('Should offer the paging links under the results, naming each page it holds', () => {
    const secondPageHref = '/select?page=2'
    const document = documentOf(
      renderResults([row], {
        pagination: {
          next: { href: secondPageHref, text: pickerCopy.pagination.next },
          items: [
            { number: 1, href: '/select', current: true },
            { number: 2, href: secondPageHref, current: false }
          ]
        }
      })
    )
    const paging =
      document.querySelector(FORM_GROUP_SELECTOR).nextElementSibling

    expect(paging.classList.contains('govuk-pagination')).toBe(true)
    expect(
      [...paging.querySelectorAll('.govuk-pagination__link')].map((link) =>
        link.textContent.trim()
      )
    ).toEqual(['1', '2', pickerCopy.pagination.next])
  })

  it('Should offer no paging links when one page holds every address', () => {
    const document = documentOf(renderResults([row]))

    expect(document.querySelector('.govuk-pagination')).toBeNull()
  })

  it('Should render the accessible name inside a visually-hidden span so the radio circle stays visible', () => {
    const html = renderResults([row])

    expect(html).not.toMatch(
      /class="[^"]*govuk-radios__label[^"]*govuk-visually-hidden/
    )
    expect(html).toContain(
      '<span class="govuk-visually-hidden">Select Astra Rosales</span>'
    )
  })

  it('Should escape an address name holding markup characters in the radio label', () => {
    const document = documentOf(
      renderResults([pickerRow({ name: 'Fish & <b>Chips</b> Ltd' })])
    )

    const label = document.querySelector('.govuk-radios__label')

    expect(label.textContent.trim()).toBe('Select Fish & <b>Chips</b> Ltd')
    expect(label.querySelector('b')).toBeNull()
  })

  it('Should put the count in the paragraph straight after the results heading, outside the table', () => {
    const document = documentOf(renderResults([row]))

    const heading = document.querySelector('h2')
    const count = heading.nextElementSibling

    expect(heading.textContent).toBe(pickerCopy.resultsHeading)
    expect(count.tagName).toBe('P')
    expect(count.textContent).toBe('Showing 1 out of 1 results')
    expect(count.closest('table')).toBeNull()
  })

  it('Should hold the table in one fieldset named by a visually hidden legend, after the count', () => {
    const document = documentOf(renderResults([row]))

    const fieldset = document.querySelector('h2 + p + div > fieldset')
    const legend = fieldset.querySelector('legend')

    expect(legend.textContent.trim()).toBe(pickerCopy.resultsHeading)
    expect(legend.classList.contains('govuk-visually-hidden')).toBe(true)
    expect(fieldset.querySelector('table').firstElementChild.tagName).toBe(
      'THEAD'
    )
  })

  it('Should head the table with select, name, address, country and actions columns, matching each row, when linking to the address book', () => {
    const document = documentOf(renderResults([row]))

    const headings = [...document.querySelectorAll('thead th')].map((heading) =>
      heading.textContent.trim()
    )

    expect(headings).toEqual([
      pickerCopy.table.selectHidden,
      pickerCopy.table.name,
      pickerCopy.table.address,
      pickerCopy.table.country,
      pickerCopy.table.actionsHidden
    ])
    expect(document.querySelectorAll('tbody tr:first-child td')).toHaveLength(
      headings.length
    )
  })

  it('Should head the table with select, name, address and country columns, matching each row, when not linking to the address book', () => {
    const document = documentOf(renderResults([row], { withViewLinks: false }))

    const headings = [...document.querySelectorAll('thead th')].map((heading) =>
      heading.textContent.trim()
    )

    expect(headings).toEqual([
      pickerCopy.table.selectHidden,
      pickerCopy.table.name,
      pickerCopy.table.address,
      pickerCopy.table.country
    ])
    expect(document.querySelectorAll('tbody tr:first-child td')).toHaveLength(
      headings.length
    )
  })

  it('Should describe the fieldset by the error and hold the error message inside it', () => {
    const document = documentOf(
      renderResults([row], { error: 'Select a consignor from the list' })
    )

    const fieldset = document.querySelector('fieldset')
    const error = fieldset.querySelector('#party-error')

    expect(fieldset.getAttribute('aria-describedby')).toBe('party-error')
    expect(error.textContent.replace(/\s+/g, ' ').trim()).toBe(
      'Error: Select a consignor from the list'
    )
  })

  it('Should wrap the fieldset in an error form group when there is an error', () => {
    const document = documentOf(
      renderResults([row], { error: 'Select a consignor from the list' })
    )

    const group = document.querySelector('.govuk-form-group--error')

    expect(group.querySelector('fieldset')).not.toBeNull()
  })

  it('Should wrap the fieldset in a plain form group when there is no error', () => {
    const document = documentOf(renderResults([row]))

    expect(document.querySelector('.govuk-form-group--error')).toBeNull()
    expect(
      document.querySelector('.govuk-form-group > fieldset')
    ).not.toBeNull()
  })

  it('Should leave the fieldset undescribed when there is no error', () => {
    const document = documentOf(renderResults([row]))

    expect(
      document.querySelector('fieldset').hasAttribute('aria-describedby')
    ).toBe(false)
  })

  it('Should put the no-matches message where the count goes when nothing matched', () => {
    const document = documentOf(renderResults([]))

    const message = document.querySelector('h2').nextElementSibling

    expect(message.tagName).toBe('P')
    expect(message.textContent).toBe(pickerCopy.noMatches)
    expect(document.querySelector('fieldset')).toBeNull()
    expect(document.querySelector('table')).toBeNull()
  })
})

describe('addressPicker macro', () => {
  it('Should offer Save and continue alone, with no return-to-hub or exit action', () => {
    const html = renderPicker()

    expect(html).toContain(sharedEn.saveActions.saveAndContinue)
    expect(html).toContain('value="save"')
    expect(html).not.toContain(sharedEn.saveActions.saveAndReturnToHub)
    expect(html).not.toContain(sharedEn.saveActions.cancelAndReturnToHub)
    expect(html).not.toContain('name="exit"')
  })

  it('Should open with the form, whose first label is the search box', () => {
    const form = documentOf(renderPicker()).querySelector('form')

    expect(form.querySelector('label').textContent.trim()).toBe(
      pickerCopy.search.label
    )
    expect(form.previousElementSibling).toBeNull()
  })

  it('Should name the chosen address between the search field and the results heading', () => {
    const form = documentOf(renderPicker(pickerShowing({ selected: row }))) //
      .querySelector('form')
    const searchFormGroup = form.querySelector(FORM_GROUP_SELECTOR)
    const afterSearch = searchFormGroup.nextElementSibling

    expect(afterSearch.textContent.trim()).toBe(
      pickerCopy.selectedAddress(row.name)
    )
    expect(afterSearch.nextElementSibling.textContent.trim()).toBe(
      pickerCopy.resultsHeading
    )
  })

  it('Should render the results heading directly after the search field while no address is chosen', () => {
    const form = documentOf(renderPicker(pickerShowing())).querySelector('form')
    const searchFormGroup = form.querySelector(FORM_GROUP_SELECTOR)

    expect(searchFormGroup.nextElementSibling.textContent.trim()).toBe(
      pickerCopy.resultsHeading
    )
  })

  it('Should carry the page being shown in the form, so a search and a save know it', () => {
    const form = documentOf(
      renderPicker(pickerShowing({ page: 2 }))
    ).querySelector('form')

    expect(form.querySelector('input[name="page"]').value).toBe('2')
  })
})
