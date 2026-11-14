import { describe, expect, it } from 'vitest'

import {
  speciesLabel,
  speciesSentenceName,
  speciesTitleName
} from './species-label.js'

const BOS_TAURUS = 'Bos taurus'

describe('#speciesLabel', () => {
  it('Should label a species as its Latin name with its common name in brackets', () => {
    expect(
      speciesLabel({
        speciesLatinName: BOS_TAURUS,
        speciesCommonName: 'Cattle'
      })
    ).toBe(`${BOS_TAURUS} (Cattle)`)
  })

  it('Should label a species with no common name as its Latin name alone, with no brackets', () => {
    expect(speciesLabel({ speciesLatinName: BOS_TAURUS })).toBe(BOS_TAURUS)
  })

  it('Should label a line with no Latin name yet as blank', () => {
    expect(speciesLabel({ speciesCommonName: 'Cattle' })).toBe('')
  })
})

describe('#speciesTitleName', () => {
  it('Should capitalise every word of a Latin name stored in sentence case', () => {
    expect(speciesTitleName({ speciesLatinName: BOS_TAURUS })).toBe(
      'Bos Taurus'
    )
  })

  it('Should capitalise every word of a Latin name stored in lower case', () => {
    expect(speciesTitleName({ speciesLatinName: 'bison bison' })).toBe(
      'Bison Bison'
    )
  })

  it('Should keep a single-word name capitalised', () => {
    expect(speciesTitleName({ speciesLatinName: 'struthio' })).toBe('Struthio')
  })

  it('Should return blank for a line with no Latin name yet', () => {
    expect(speciesTitleName({ speciesCommonName: 'Cattle' })).toBe('')
  })
})

describe('#speciesSentenceName', () => {
  it('Should lower-case a Latin name for use inside a sentence', () => {
    expect(speciesSentenceName({ speciesLatinName: 'Felis catus' })).toBe(
      'felis catus'
    )
  })

  it('Should return blank for a line with no Latin name yet', () => {
    expect(speciesSentenceName({ speciesCommonName: 'Cats' })).toBe('')
  })
})
