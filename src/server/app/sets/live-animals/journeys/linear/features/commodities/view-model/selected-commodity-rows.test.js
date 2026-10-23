import { describe, expect, it } from 'vitest'

import {
  buildChangeableCommoditiesTable,
  buildRemovableCommoditiesTable
} from './selected-commodity-rows.js'

const headings = {
  commodityCode: 'Commodity code',
  commonName: 'Common name',
  species: 'Species',
  numberOfAnimals: 'Number of animals',
  actionsHidden: 'Actions'
}

const COW_AND_CALF = 'Cow & calf'
const BOS_TAURUS = 'Bos taurus'
const WRAPPING = 'app-table__cell--break-anywhere'
const RIGHT = 'govuk-!-text-align-right'

const leadingCells = [
  { text: '0102', classes: WRAPPING },
  { text: COW_AND_CALF, classes: WRAPPING },
  { html: BOS_TAURUS, classes: WRAPPING }
]

describe('#buildRemovableCommoditiesTable', () => {
  it('Should end each row with a Remove button named for its commodity, escaping the name', () => {
    const table = buildRemovableCommoditiesTable(
      [
        {
          code: '0102',
          name: COW_AND_CALF,
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
          html: '<button type="submit" class="govuk-link app-link-button" name="action" value="remove:0">Remove<span class="govuk-visually-hidden"> Cow &amp; calf</span></button>',
          classes: RIGHT
        }
      ]
    ])
  })
})

describe('#buildChangeableCommoditiesTable', () => {
  it('Should follow each row with its animal total and a Change link to the commodity list', () => {
    const table = buildChangeableCommoditiesTable(
      [
        {
          code: '0102',
          name: COW_AND_CALF,
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
          html: '<a class="govuk-link" href="/notifications/journey-1/commodities">Change<span class="govuk-visually-hidden"> Cow &amp; calf</span></a>',
          classes: RIGHT
        }
      ]
    ])
  })
})
