import { describe, expect, it } from 'vitest'

import {
  commodityCodeFor,
  commodityLabel,
  cphCommodities,
  cphExemptCommodityCodes,
  earTagCommodities,
  horseNameCommodities,
  identifiedCommodities,
  identifiersFor,
  list,
  microchipCommodities,
  passportCommodities,
  permanentAddressCommodities,
  speciesCommonName,
  speciesLatinName,
  speciesListedIndividually,
  tattooCommodities
} from './index.js'

const NOT_A_COMMODITY = 'not-a-commodity'
const NOT_IN_THE_CATALOGUE = 'not-in-the-catalogue'

describe('#speciesLatinName', () => {
  it("Should give the species' Latin name", () => {
    expect(speciesLatinName('1148346')).toBe('Bos taurus')
    expect(speciesLatinName('716661')).toBe('Bison bison')
  })

  it('Should give back the stored value where the catalogue holds no species for it', () => {
    expect(speciesLatinName(NOT_IN_THE_CATALOGUE)).toBe(NOT_IN_THE_CATALOGUE)
  })
})

describe('#speciesCommonName', () => {
  it("Should give the species' own common name", () => {
    expect(speciesCommonName('Cow', '1148346')).toBe('Domestic cattle')
    expect(speciesCommonName('Cow', '716661')).toBe('American bison')
  })

  it('Should fall back to the commodity name where the catalogue holds no common name for the species', () => {
    expect(speciesCommonName('Cow', NOT_IN_THE_CATALOGUE)).toBe('Cow')
    expect(speciesCommonName(NOT_A_COMMODITY, '1148346')).toBe(NOT_A_COMMODITY)
  })
})

describe('#speciesListedIndividually', () => {
  it('Should hold for the commodities on code 01061900 and for no others', () => {
    expect(speciesListedIndividually('Cat')).toBe(true)
    expect(speciesListedIndividually('Dog')).toBe(true)
    expect(speciesListedIndividually('Cow')).toBe(false)
    expect(speciesListedIndividually('Horse')).toBe(false)
    expect(speciesListedIndividually('Fish')).toBe(false)
    expect(speciesListedIndividually(NOT_A_COMMODITY)).toBe(false)
  })
})

describe('#identifiersFor', () => {
  it('Should give each commodity its identifiers in the order it asks for them', () => {
    expect(identifiersFor('Cow')).toEqual([
      'animalIdentifierEarTag',
      'animalIdentifierPassport'
    ])
    expect(identifiersFor('Horse')).toEqual([
      'animalIdentifierMicrochip',
      'animalIdentifierPassport',
      'horseName'
    ])
    expect(identifiersFor('Cat')).toEqual([
      'animalIdentifierMicrochip',
      'animalIdentifierPassport',
      'animalIdentifierTattoo'
    ])
  })

  it('Should give no identifiers for a commodity that carries none, or is not a commodity at all', () => {
    expect(identifiersFor('Fish')).toEqual([])
    expect(identifiersFor(NOT_A_COMMODITY)).toEqual([])
  })
})

describe('the identifier allowlists', () => {
  const derivations = [
    ['microchip', microchipCommodities, 'animalIdentifierMicrochip'],
    ['passport', passportCommodities, 'animalIdentifierPassport'],
    ['tattoo', tattooCommodities, 'animalIdentifierTattoo'],
    ['ear tag', earTagCommodities, 'animalIdentifierEarTag'],
    ['horse name', horseNameCommodities, 'horseName']
  ]

  for (const [name, allowlist, identifier] of derivations) {
    it(`Should hold exactly the commodities whose own list carries the ${name}`, () => {
      for (const commodity of allowlist()) {
        expect(identifiersFor(commodity)).toContain(identifier)
      }
      expect(identifiersFor('Fish')).not.toContain(identifier)
    })
  }

  it('Should hold exactly the commodities whose own list carries at least one identifier', () => {
    for (const commodity of list()) {
      expect(identifiedCommodities().includes(commodity)).toBe(
        identifiersFor(commodity).length > 0
      )
    }
    expect(identifiedCommodities()).not.toContain('Fish')
    expect(identifiedCommodities()).toEqual(
      expect.arrayContaining(['Cow', 'Horse', 'Cat', 'Dog'])
    )
  })

  it('Should hold every commodity that is asked for a permanent address', () => {
    for (const commodity of permanentAddressCommodities()) {
      expect(identifiedCommodities()).toContain(commodity)
    }
  })
})

describe('the CPH exemption', () => {
  it('Should exempt exactly the horse and cat/dog/ferret codes', () => {
    expect([...cphExemptCommodityCodes()].sort()).toEqual(['0101', '01061900'])
  })

  it('Should ask every commodity whose code is not exempt', () => {
    for (const commodity of list()) {
      expect(cphCommodities().includes(commodity)).toBe(
        !cphExemptCommodityCodes().includes(commodityCodeFor(commodity))
      )
    }
  })
})

describe('#commodityLabel', () => {
  it('Should append the code in brackets to the name when there is one', () => {
    expect(commodityLabel('Bovine', '0102')).toBe('Bovine (0102)')
  })

  it('Should give the name alone when there is no code', () => {
    expect(commodityLabel('Bovine', undefined)).toBe('Bovine')
    expect(commodityLabel('Bovine', '')).toBe('Bovine')
  })
})
