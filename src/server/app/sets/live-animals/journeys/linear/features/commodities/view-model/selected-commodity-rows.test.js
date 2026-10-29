import { describe, expect, it } from 'vitest'

import {
  buildChangeableCommoditiesTable,
  buildRemovableCommoditiesTable
} from './selected-commodity-rows.js'

const headings = {
  commodityCode: 'Commodity code',
  species: 'Species',
  numberOfAnimals: 'Number of animals',
  actionsHidden: 'Actions'
}

const BOS_TAURUS = 'Bos taurus'
const HTML_LATIN = 'Felis <catus> & friends'
const ESCAPED_LATIN = 'Felis &lt;catus&gt; &amp; friends'
const WRAPPING = 'app-table__cell--break-anywhere'
const RIGHT = 'govuk-!-text-align-right'

const leadingCells = [
  { text: '0102', classes: WRAPPING },
  { html: BOS_TAURUS, classes: WRAPPING }
]

describe('#buildRemovableCommoditiesTable', () => {
  const removableHtmlTable = () =>
    buildRemovableCommoditiesTable(
      [
        {
          code: '01061900',
          latinNames: [HTML_LATIN],
          removeAction: 'remove-species:0'
        }
      ],
      headings,
      { remove: 'Remove' }
    )

  it('Should escape a Latin name that contains HTML characters in the species cell', () => {
    expect(removableHtmlTable().rows[0][1].html).toBe(ESCAPED_LATIN)
  })

  it('Should escape a Latin name that contains HTML characters in the Remove hidden text', () => {
    expect(removableHtmlTable().rows[0][2].html).toBe(
      `<button type="submit" class="govuk-link app-link-button" name="action" value="remove-species:0">Remove<span class="govuk-visually-hidden"> 01061900 ${ESCAPED_LATIN}</span></button>`
    )
  })

  it('Should end each row with a Remove button named for its code and species', () => {
    const table = buildRemovableCommoditiesTable(
      [
        {
          code: '0102',
          latinNames: [BOS_TAURUS],
          removeAction: 'remove:0'
        }
      ],
      headings,
      { remove: 'Remove' }
    )

    expect(table.head.slice(-1)).toEqual([
      { html: '<span class="govuk-visually-hidden">Actions</span>' }
    ])
    expect(table.rows).toEqual([
      [
        ...leadingCells,
        {
          html: '<button type="submit" class="govuk-link app-link-button" name="action" value="remove:0">Remove<span class="govuk-visually-hidden"> 0102 Bos taurus</span></button>',
          classes: RIGHT
        }
      ]
    ])
  })
})

describe('#buildChangeableCommoditiesTable', () => {
  it('Should escape a Latin name that contains HTML characters in the Change link hidden text', () => {
    const table = buildChangeableCommoditiesTable(
      [
        {
          code: '01061900',
          latinNames: [HTML_LATIN],
          animals: '1'
        }
      ],
      headings,
      { change: 'Change' },
      '/notifications/journey-1/commodities'
    )

    expect(table.rows[0][3].html).toBe(
      `<a class="govuk-link" href="/notifications/journey-1/commodities">Change<span class="govuk-visually-hidden"> 01061900 ${ESCAPED_LATIN}</span></a>`
    )
  })

  it('Should follow each row with its animal total and a Change link to the commodity list named for its code and species', () => {
    const table = buildChangeableCommoditiesTable(
      [
        {
          code: '0102',
          latinNames: [BOS_TAURUS],
          animals: '5'
        }
      ],
      headings,
      { change: 'Change' },
      '/notifications/journey-1/commodities'
    )

    expect(table.head.slice(-2)).toEqual([
      { text: 'Number of animals' },
      { html: '<span class="govuk-visually-hidden">Actions</span>' }
    ])
    expect(table.rows).toEqual([
      [
        ...leadingCells,
        { text: '5' },
        {
          html: '<a class="govuk-link" href="/notifications/journey-1/commodities">Change<span class="govuk-visually-hidden"> 0102 Bos taurus</span></a>',
          classes: RIGHT
        }
      ]
    ])
  })
})
