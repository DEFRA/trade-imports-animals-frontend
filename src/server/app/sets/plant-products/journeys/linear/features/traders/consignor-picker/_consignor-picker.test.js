import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../../../../../../../config/nunjucks/nunjucks.js'
import { copy as tradersCopy } from '../copy/copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment
const pickerCopy = tradersCopy.consignorPicker

const render = (picker) =>
  environment.renderString(
    `{% from "plant-products/journeys/linear/features/traders/consignor-picker/_consignor-picker.njk" import consignorPicker %}
     {{ consignorPicker(picker, crumb, copy) }}`,
    {
      picker: {
        createConsignorHref:
          '/plant-products/notifications/j-1/consignor-create',
        resultsCaption: pickerCopy.resultsCaption(
          picker.rows.length,
          picker.rows.length
        ),
        query: '',
        page: 1,
        pagination: null,
        ...picker
      },
      crumb: 'crumb-token',
      copy: pickerCopy
    }
  )

const row = (overrides = {}) => ({
  id: 'example-consignor-01',
  idPrefix: 'party',
  name: 'Example Consignor 01 (sample data)',
  addressText: '1 Example Street, Example City, ZZ99 01',
  country: 'France',
  detailLines: ['Example Consignor 01 (sample data)', 'France'],
  checked: false,
  ...overrides
})

const occurrences = (html, pattern) => html.match(pattern)?.length ?? 0

describe('consignorPicker macro', () => {
  it('renders one form carrying the crumb and one radio per row', () => {
    const html = render({
      rows: [
        row(),
        row({
          id: 'example-consignor-02',
          idPrefix: 'party-2',
          name: 'Example Consignor 02 (sample data)'
        })
      ]
    })

    expect(occurrences(html, /<form\b/g)).toBe(1)
    expect(html).toContain(
      '<input type="hidden" name="crumb" value="crumb-token"'
    )
    expect(occurrences(html, /type="radio"/g)).toBe(2)
    expect(occurrences(html, /name="party"/g)).toBe(2)
    expect(html).toContain('id="party"')
    expect(html).toContain('id="party-2"')
    expect(html).toContain(
      '<span class="govuk-visually-hidden">Select Example Consignor 01 (sample data)</span>'
    )
    expect(html).toContain(
      '<span class="govuk-visually-hidden">Select Example Consignor 02 (sample data)</span>'
    )
  })

  it('escapes a saved name rather than rendering it as markup', () => {
    const html = render({
      rows: [row({ name: '<img src=x onerror="alert(1)">' })]
    })

    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('renders the country column for each row', () => {
    const html = render({ rows: [row()] })

    expect(html).toContain('<td class="govuk-table__cell">France</td>')
  })

  it('offers the create action as a secondary button anchored for the error summary', () => {
    const html = render({ rows: [row()] })

    expect(html).toMatch(
      /<a[^>]*id="add-consignor"[^>]*>|<a[^>]*href="\/plant-products\/notifications\/j-1\/consignor-create"/
    )
    expect(html).toContain('id="add-consignor"')
    expect(html).toContain(
      'href="/plant-products/notifications/j-1/consignor-create"'
    )
    expect(html).toContain('Add a consignor or exporter')
    expect(html).toContain('govuk-button--secondary')
  })

  it('renders the inline error message when the picker carries one', () => {
    const html = render({
      rows: [row()],
      error: pickerCopy.errors.required
    })

    expect(html).toContain('id="party-error"')
    expect(html).toContain('Select a consignor or exporter from the list')
  })

  it('names the current selection in an inset', () => {
    const html = render({
      rows: [row({ checked: true })],
      selected: {
        id: 'example-consignor-01',
        name: 'Example Consignor 01 (sample data)'
      }
    })

    expect(html).toContain('govuk-inset-text')
    expect(html).toContain(
      'Selected consignor or exporter: Example Consignor 01 (sample data)'
    )
    expect(html).toContain('checked')
  })

  it('renders the empty state without a table', () => {
    const html = render({ rows: [] })

    expect(html).toContain(
      'You have not saved any consignors or exporters yet.'
    )
    expect(html).not.toContain('<table')
    expect(html).toContain('id="add-consignor"')
  })

  it('keeps the search box and offers the no-matches line when a query leaves no rows', () => {
    const html = render({ rows: [], query: 'no such trader' })

    expect(html).toContain('No consignors or exporters match your search.')
    expect(html).not.toContain(
      'You have not saved any consignors or exporters yet.'
    )
    expect(html).toContain('id="q"')
    expect(html).toContain('name="q"')
    expect(html).toContain('value="search"')
  })

  it('puts the search and both submits in the one form with no client script', () => {
    const html = render({ rows: [row()], page: 2 })

    expect(occurrences(html, /<form\b/g)).toBe(1)
    expect(html).toContain('id="q"')
    expect(html).toContain('name="q"')
    expect(occurrences(html, /name="action"/g)).toBe(2)
    expect(html).toContain('value="search"')
    expect(html).toContain('value="save"')
    expect(html).toContain('<input type="hidden" name="page" value="2"')
    expect(html).not.toContain('<script')
  })

  it('carries the current search term back into the input', () => {
    const html = render({ rows: [row()], query: 'orchard' })

    expect(html).toContain('value="orchard"')
    expect(html).toContain('Name, address or country')
  })

  // The hidden field is what survives a paging link, so the record chosen on
  // one page is still the record saved from another.
  it('carries the selection in a hidden field only when there is one', () => {
    const withSelection = render({
      rows: [row({ checked: true })],
      selected: { id: 'example-consignor-01', name: 'Example Consignor 01' }
    })

    expect(withSelection).toContain(
      '<input type="hidden" name="selected" value="example-consignor-01"'
    )
    expect(render({ rows: [row()] })).not.toContain('name="selected"')
  })

  it('omits the pagination component when there are not enough pages for it', () => {
    const html = render({ rows: [row()] })

    expect(html).not.toContain('govuk-pagination')
  })

  it('renders every pagination link with the query, the page and the selection', () => {
    const hrefFor = (number) =>
      `/plant-products/notifications/j-1/consignor-select?q=example&page=${number}&selected=example-consignor-01`
    const html = render({
      rows: [row()],
      query: 'example',
      page: 2,
      selected: { id: 'example-consignor-01', name: 'Example Consignor 01' },
      pagination: {
        previous: { href: hrefFor(1) },
        next: { href: hrefFor(3) },
        items: [
          { number: 1, href: hrefFor(1), current: false },
          { number: 2, href: hrefFor(2), current: true },
          { number: 3, href: hrefFor(3), current: false }
        ]
      }
    })

    const escaped = (href) => href.replaceAll('&', '&amp;')

    expect(html).toContain('govuk-pagination')
    for (const number of [1, 2, 3]) {
      expect(html).toContain(`href="${escaped(hrefFor(number))}"`)
    }
    // Previous, next and the three numbers — every one of the five carries the
    // query and the selection.
    expect(
      occurrences(
        html,
        /q=example&amp;page=\d&amp;selected=example-consignor-01/g
      )
    ).toBe(5)
  })
})
