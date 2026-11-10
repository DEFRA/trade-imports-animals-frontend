import { describe, expect, it } from 'vitest'

import { legendHtmlFor, speciesLabelHtml } from './labels.js'

describe('#legendHtmlFor', () => {
  it('Should name the commodity with its code in brackets', () => {
    expect(legendHtmlFor('0102', '')).toBe('Cow (0102)')
  })

  it('Should show the code alone for a commodity with no name', () => {
    expect(legendHtmlFor('01061900', '')).toBe('01061900')
  })

  it('Should bold the part of the commodity heading the query matched', () => {
    expect(legendHtmlFor('0102', '01')).toBe(
      'Cow (<strong class="govuk-!-font-weight-bold">01</strong>02)'
    )
  })

  it('Should bold a match in the commodity name', () => {
    expect(legendHtmlFor('0102', 'co')).toBe(
      '<strong class="govuk-!-font-weight-bold">Co</strong>w (0102)'
    )
  })
})

describe('#speciesLabelHtml', () => {
  it('Should bold the part of a species label the query matched, ignoring case', () => {
    expect(speciesLabelHtml({ speciesLatinName: 'Bos taurus' }, 'TAURUS')).toBe(
      'Bos <strong class="govuk-!-font-weight-bold">taurus</strong>'
    )
  })

  it('Should bold the part of a species label the query matched, ignoring accents', () => {
    expect(
      speciesLabelHtml({ speciesLatinName: 'Garcia felina' }, 'garcia')
    ).toBe('<strong class="govuk-!-font-weight-bold">Garcia</strong> felina')
    expect(
      speciesLabelHtml({ speciesLatinName: 'García felina' }, 'garcia')
    ).toBe('<strong class="govuk-!-font-weight-bold">García</strong> felina')
  })
})
