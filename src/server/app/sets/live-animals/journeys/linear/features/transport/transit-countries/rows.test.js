import { describe, expect, it } from 'vitest'

import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { countriesTable } from './rows.js'

const copy = copyFor({ en, cy }).transitCountries

describe('#countriesTable', () => {
  it('Should give each country a name cell and a Remove button cell named for the country', () => {
    const table = countriesTable(
      [
        { code: 'FR', name: 'France', removeAction: 'remove:FR' },
        { code: 'BE', name: 'Belgium & Co', removeAction: 'remove:BE' }
      ],
      copy
    )

    expect(table.head).toEqual([
      { text: 'Country' },
      { html: '<span class="govuk-visually-hidden">Actions</span>' }
    ])
    expect(table.rows).toEqual([
      [
        { text: 'France' },
        {
          html: '<button type="submit" class="govuk-link app-link-button" name="action" value="remove:FR">Remove<span class="govuk-visually-hidden"> France</span></button>',
          classes: 'govuk-!-text-align-right'
        }
      ],
      [
        { text: 'Belgium & Co' },
        {
          html: '<button type="submit" class="govuk-link app-link-button" name="action" value="remove:BE">Remove<span class="govuk-visually-hidden"> Belgium &amp; Co</span></button>',
          classes: 'govuk-!-text-align-right'
        }
      ]
    ])
  })

  it('Should give no rows when no country has been added', () => {
    expect(countriesTable([], copy).rows).toEqual([])
  })
})
