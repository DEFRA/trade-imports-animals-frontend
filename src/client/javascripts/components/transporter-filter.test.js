// @vitest-environment jsdom

import { createAll } from 'govuk-frontend'
import {
  APPROVED,
  COMMERCIAL,
  NEW,
  PRIVATE
} from '../../../server/app/services/transporters/index.js'
import {
  matchingTransporters,
  shownCountMessages,
  transporterRows
} from '../../../server/app/sets/live-animals/journeys/linear/features/transport/transporters/rows.js'
import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { copy as sharedCopy } from '../../../server/app/shared/copy.en.js'
import { copy } from '../../../server/app/sets/live-animals/journeys/linear/features/transport/copy/copy.en.js'
import TransporterFilter from './transporter-filter.js'

const BOLD_CLASS = 'govuk-\\!-font-weight-bold'

const records = [
  {
    id: 'garcia-livestock-transport',
    type: COMMERCIAL,
    status: APPROVED,
    name: 'García Livestock Transport SL',
    approvalNumber: 'ES-T2-45001294',
    address: {
      addressLine1: '43 East Hague Extension',
      country: 'Switzerland'
    }
  },
  {
    id: 'aberdeen-livestock',
    type: PRIVATE,
    status: APPROVED,
    name: 'Aberdeen Livestock Ltd',
    address: {
      addressLine1: '12 Harbour Road',
      townOrCity: 'Aberdeen',
      postcode: 'AB11 5DQ',
      country: 'United Kingdom'
    }
  },
  {
    id: 'rhodes-and-sons',
    type: PRIVATE,
    status: NEW,
    name: 'Rhodes & Sons',
    address: {
      addressLine1: '3 Mill Lane',
      townOrCity: 'Dunmore',
      country: 'Ireland'
    }
  }
]

const TRANSPORTERS_TEMPLATE =
  'live-animals/journeys/linear/features/transport/transporters/transporters.njk'

const environment = nunjucksConfig.options.compileOptions.environment

const filterModuleHtml = ({ rows, term }) => {
  const page = document.createElement('div')
  page.innerHTML = environment.render(TRANSPORTERS_TEMPLATE, {
    assetPath: '/public/assets',
    getAssetPath: (asset) => `/public/${asset}`,
    userSession: { isAuthenticated: true, displayName: 'Andrew Farmer' },
    copy: copy.transporters,
    sharedCopy,
    errors: {},
    query: term,
    shownMessages: shownCountMessages(rows.length),
    transporterRows: rows
  })
  return page.querySelector('[data-module="app-transporter-filter"]').outerHTML
}

const mountFilter = ({ term = '', selectedId } = {}) => {
  const rows = transporterRows(records, { selectedId })
  document.body.innerHTML = `<form>${filterModuleHtml({ rows, term })}</form>`
  document.body.classList.add('govuk-frontend-supported')
  createAll(TransporterFilter, undefined, { scope: document.body })
  return {
    searchBox: document.querySelector('input[name="search"]'),
    searchButton: document.querySelector('button[name="action"]'),
    table: document.querySelector('[data-transporter-table]'),
    noMatches: document.querySelector('[data-transporter-no-matches]'),
    liveRegion: document.querySelector('[data-transporter-shown]'),
    rows: [...document.querySelectorAll('tbody tr')]
  }
}

const type = (searchBox, term) => {
  searchBox.value = term
  searchBox.dispatchEvent(new Event('input', { bubbles: true }))
}

const shownNames = (rows) =>
  rows.filter((row) => !row.hidden).map((row) => row.cells[1].textContent)

const boldTextIn = (cell) =>
  [...cell.querySelectorAll(`.${BOLD_CLASS}`)].map((bold) => bold.textContent)

describe('TransporterFilter', () => {
  it.each(['garcia', 'switzerland es-t2', 'private', 'new', 'HARBOUR'])(
    'Should show the rows the server search keeps for "%s"',
    (term) => {
      const { searchBox, rows } = mountFilter()

      type(searchBox, term)

      expect(shownNames(rows)).toEqual(
        matchingTransporters(records, term).map((record) => record.name)
      )
    }
  )

  it('Should bold all six letters of an accented name found from plain letters', () => {
    const { searchBox, rows } = mountFilter()

    type(searchBox, 'garcia')

    expect(boldTextIn(rows[0].cells[1])).toEqual(['García'])
  })

  it('Should show a row found by a term that runs across two cells with nothing bold', () => {
    const { searchBox, rows } = mountFilter()

    type(searchBox, 'switzerland es-t2')

    expect(shownNames(rows)).toEqual(['García Livestock Transport SL'])
    expect(rows[0].querySelectorAll(`.${BOLD_CLASS}`)).toHaveLength(0)
  })

  it('Should bold the status word inside its tag', () => {
    const { searchBox, rows } = mountFilter()

    type(searchBox, 'new')

    expect(boldTextIn(rows[2].cells[5])).toEqual(['New'])
  })

  it('Should show every row again, unbolded, when the box is emptied', () => {
    const { searchBox, rows } = mountFilter()
    type(searchBox, 'garcia')

    type(searchBox, '')

    expect(shownNames(rows)).toHaveLength(records.length)
    expect(document.querySelectorAll(`.${BOLD_CLASS}`)).toHaveLength(0)
  })

  it('Should show a name with an ampersand as written, with its match bold', () => {
    const { searchBox, rows } = mountFilter()

    type(searchBox, '&')

    expect(rows[2].cells[1].textContent).toBe('Rhodes & Sons')
    expect(boldTextIn(rows[2].cells[1])).toEqual(['&'])
    expect(rows[2].cells[1].querySelector('script')).toBeNull()
  })

  it('Should announce the message for one transporter shown', () => {
    const { searchBox, liveRegion } = mountFilter()

    type(searchBox, 'garcia')

    expect(liveRegion.textContent).toBe('1 transporter shown')
  })

  it('Should announce the message for several transporters shown', () => {
    const { searchBox, liveRegion } = mountFilter()

    type(searchBox, 'livestock')

    expect(liveRegion.textContent).toBe('2 transporters shown')
  })

  it('Should show the empty-state message and hide the table when nothing matches', () => {
    const { searchBox, table, noMatches, liveRegion } = mountFilter()

    type(searchBox, 'no such transporter')

    expect(liveRegion.textContent).toBe('No transporters match your search.')
    expect(table.hidden).toBe(true)
    expect(noMatches.hidden).toBe(false)
  })

  it('Should show the table again when a later term matches', () => {
    const { searchBox, table, noMatches } = mountFilter()
    type(searchBox, 'no such transporter')

    type(searchBox, 'aberdeen')

    expect(table.hidden).toBe(false)
    expect(noMatches.hidden).toBe(true)
  })

  it('Should keep a ticked radio ticked when its row is filtered out of view', () => {
    const { searchBox, rows } = mountFilter({
      selectedId: 'garcia-livestock-transport'
    })

    type(searchBox, 'aberdeen')

    expect(rows[0].hidden).toBe(true)
    expect(rows[0].querySelector('input').checked).toBe(true)
  })

  it('Should filter by the term already in the box when the page loads', () => {
    const { rows } = mountFilter({ term: 'aberdeen' })

    expect(shownNames(rows)).toEqual(['Aberdeen Livestock Ltd'])
  })

  it('Should narrow the list without submitting when the search button is pressed', () => {
    const { searchBox, searchButton, rows } = mountFilter()
    searchBox.value = 'garcia'

    const notCancelled = searchButton.dispatchEvent(
      new Event('click', { bubbles: true, cancelable: true })
    )

    expect(notCancelled).toBe(false)
    expect(shownNames(rows)).toEqual(['García Livestock Transport SL'])
  })
})
