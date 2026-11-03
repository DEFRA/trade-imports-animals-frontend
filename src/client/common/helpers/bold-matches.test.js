import { escapeAndBoldMatches } from './bold-matches.js'

const strong = (text) =>
  `<strong class="govuk-!-font-weight-bold">${text}</strong>`

describe('escapeAndBoldMatches', () => {
  it('bolds every match in the text', () => {
    expect(escapeAndBoldMatches('Banana', 'an')).toBe(
      `B${strong('an')}${strong('an')}a`
    )
  })

  it('bolds a match at the end of the text', () => {
    expect(escapeAndBoldMatches('Ireland', 'land')).toBe(`Ire${strong('land')}`)
  })

  it('gives only the escaped text when the term is empty', () => {
    expect(escapeAndBoldMatches('R&D <x>', '')).toBe('R&amp;D &lt;x&gt;')
  })

  it('gives only the escaped text when the term is only spaces', () => {
    expect(escapeAndBoldMatches('R&D <x>', '   ')).toBe('R&amp;D &lt;x&gt;')
  })

  it('escapes HTML characters inside and outside a bolded match', () => {
    expect(escapeAndBoldMatches('R&D', '&')).toBe(`R${strong('&amp;')}D`)
  })

  it('escapes an apostrophe outside a bolded match', () => {
    expect(escapeAndBoldMatches("Côte d'Ivoire", 'cote')).toBe(
      `${strong('Côte')} d&#39;Ivoire`
    )
  })
})
