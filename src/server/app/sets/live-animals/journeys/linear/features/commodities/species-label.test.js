import { describe, expect, it } from 'vitest'

import {
  speciesDisplayName,
  speciesLabel,
  speciesSentenceName
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

describe('#speciesDisplayName', () => {
  it('Should keep a Latin name stored in sentence case as it is', () => {
    expect(speciesDisplayName({ speciesLatinName: BOS_TAURUS })).toBe(
      BOS_TAURUS
    )
  })

  it('Should capitalise only the genus of a Latin name stored in lower case', () => {
    expect(speciesDisplayName({ speciesLatinName: 'bison bison' })).toBe(
      'Bison bison'
    )
  })

  it('Should lower-case every word after the genus of a Latin name stored in title case', () => {
    expect(speciesDisplayName({ speciesLatinName: 'Bos Taurus' })).toBe(
      BOS_TAURUS
    )
  })

  it('Should capitalise a single-word Latin name stored in lower case', () => {
    expect(speciesDisplayName({ speciesLatinName: 'struthio' })).toBe(
      'Struthio'
    )
  })

  it('Should return blank for a line with no Latin name yet', () => {
    expect(speciesDisplayName({ speciesCommonName: 'Cattle' })).toBe('')
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
