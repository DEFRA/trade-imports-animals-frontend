import { describe, expect, it } from 'vitest'

import { legendHtmlFor, speciesLabelHtml } from './labels.js'

describe('#legendHtmlFor', () => {
  it('Should bold the part of the commodity heading the query matched', () => {
    expect(legendHtmlFor('0102', '01')).toBe(
      '<strong class="govuk-!-font-weight-bold">01</strong>02'
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
