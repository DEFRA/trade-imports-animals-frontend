import { describe, expect, it } from 'vitest'

import {
  cphExemptCommodityCodes,
  earTagCommodityCodes,
  horseNameCommodityCodes,
  identifiedCommodityCodes,
  identifiersFor,
  microchipCommodityCodes,
  packageCountCommodityCodes,
  passportCommodityCodes,
  permanentAddressCodeSpecies,
  listsSpeciesIndividually,
  tattooCommodityCodes,
  typeIdFor,
  typeTextForId
} from './index.js'

const CATTLE = '0102'
const HORSES = '0101'
const OTHER_MAMMALS = '01061900'
const OSTRICHES = '01063300'

describe('#listsSpeciesIndividually', () => {
  it('Should hold for code 01061900 and for no other', () => {
    expect(
      packageCountCommodityCodes().filter(listsSpeciesIndividually)
    ).toEqual([OTHER_MAMMALS])
    expect(listsSpeciesIndividually(OSTRICHES)).toBe(false)
  })
})

describe('#identifiersFor', () => {
  it('Should give each code its identifiers in the order it asks for them', () => {
    expect(identifiersFor(CATTLE)).toEqual([
      'animalIdentifierEarTag',
      'animalIdentifierPassport'
    ])
    expect(identifiersFor(HORSES)).toEqual([
      'animalIdentifierMicrochip',
      'animalIdentifierPassport',
      'horseName'
    ])
    expect(identifiersFor(OTHER_MAMMALS)).toEqual([
      'animalIdentifierMicrochip',
      'animalIdentifierPassport',
      'animalIdentifierTattoo'
    ])
  })

  it('Should give no identifiers for a code that carries none', () => {
    expect(identifiersFor(OSTRICHES)).toEqual([])
    expect(identifiersFor('not-a-code')).toEqual([])
  })
})

describe('the identifier allowlists', () => {
  const derivations = [
    [
      'microchip',
      microchipCommodityCodes,
      'animalIdentifierMicrochip',
      [HORSES, OTHER_MAMMALS]
    ],
    [
      'passport',
      passportCommodityCodes,
      'animalIdentifierPassport',
      [HORSES, CATTLE, OTHER_MAMMALS]
    ],
    ['tattoo', tattooCommodityCodes, 'animalIdentifierTattoo', [OTHER_MAMMALS]],
    ['ear tag', earTagCommodityCodes, 'animalIdentifierEarTag', [CATTLE]],
    ['horse name', horseNameCommodityCodes, 'horseName', [HORSES]]
  ]

  for (const [name, allowlist, identifier, expectedCodes] of derivations) {
    it(`Should list only codes that carry the ${name}`, () => {
      for (const code of allowlist()) {
        expect(identifiersFor(code)).toContain(identifier)
      }
      expect([...allowlist()].sort()).toEqual(expectedCodes)
    })
  }

  it('Should identify exactly the codes that carry at least one identifier', () => {
    expect([...identifiedCommodityCodes()].sort()).toEqual([
      HORSES,
      CATTLE,
      OTHER_MAMMALS
    ])
  })

  it('Should key every permanent-address species to an identified code', () => {
    for (const [code] of permanentAddressCodeSpecies()) {
      expect(identifiedCommodityCodes()).toContain(code)
    }
  })

  it('Should key the permanent-address species to 01061900 alone', () => {
    expect(permanentAddressCodeSpecies()).toEqual([
      [OTHER_MAMMALS, 'Felis catus'],
      [OTHER_MAMMALS, 'Canis familiaris'],
      [OTHER_MAMMALS, 'Canis lupus familiaris'],
      [OTHER_MAMMALS, 'Mustela putorius furo']
    ])
  })
})

describe('the CPH exemption', () => {
  it('Should exempt exactly the horse and cat/dog/ferret codes', () => {
    expect([...cphExemptCommodityCodes()].sort()).toEqual([
      HORSES,
      OTHER_MAMMALS
    ])
  })
})

describe('#typeIdFor', () => {
  it('Should split cattle into Domestic and Game by species', () => {
    expect(typeIdFor(CATTLE, 'Bos taurus')).toBe('16')
    expect(typeIdFor(CATTLE, 'Bos spp.')).toBe('24')
  })

  it('Should give every other code its one type', () => {
    const otherCodes = packageCountCommodityCodes().filter(
      (code) => code !== CATTLE
    )
    for (const code of otherCodes) {
      expect(typeIdFor(code, 'Felis catus')).toBe('2')
      expect(typeIdFor(code, 'Bos spp.')).toBe('2')
    }
  })
})

describe('#typeTextForId', () => {
  it('Should name the cattle types Domestic and Game', () => {
    expect(typeTextForId(CATTLE, '16')).toBe('Domestic')
    expect(typeTextForId(CATTLE, '24')).toBe('Game')
  })

  it('Should give a single-type code blank text', () => {
    expect(typeTextForId(OTHER_MAMMALS, '2')).toBe('')
  })

  it('Should give no text for a type id the code does not have', () => {
    expect(typeTextForId(CATTLE, '2')).toBeUndefined()
  })
})
