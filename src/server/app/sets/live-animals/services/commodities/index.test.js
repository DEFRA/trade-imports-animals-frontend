import { describe, expect, it } from 'vitest'

import {
  cphExemptCommodityCodes,
  earTagCommodityCodes,
  horseNameCommodityCodes,
  identifiedCommodityCodes,
  identifiersFor,
  commodityDescriptionFor,
  commodityNameFor,
  microchipCommodityCodes,
  packageCountCommodityCodes,
  passportCommodityCodes,
  permanentAddressCodeSpecies,
  listsSpeciesIndividually,
  needsIdentifying,
  tattooCommodityCodes,
  typeIdFor,
  typeTextForId
} from './index.js'
import { CATTLE_CODE, HORSES_CODE, OTHER_LIVE_MAMMALS_CODE } from './rules.js'
import { OSTRICHES_CODE } from '../../journeys/linear/features/commodities/search/test-support.js'

describe('#listsSpeciesIndividually', () => {
  it('Should hold for code 01061900 and for no other', () => {
    expect(
      packageCountCommodityCodes().filter(listsSpeciesIndividually)
    ).toEqual([OTHER_LIVE_MAMMALS_CODE])
    expect(listsSpeciesIndividually(OSTRICHES_CODE)).toBe(false)
  })
})

describe('#identifiersFor', () => {
  it('Should give each code its identifiers in the order it asks for them', () => {
    expect(identifiersFor(CATTLE_CODE)).toEqual([
      'animalIdentifierEarTag',
      'animalIdentifierPassport'
    ])
    expect(identifiersFor(HORSES_CODE)).toEqual([
      'animalIdentifierMicrochip',
      'animalIdentifierPassport',
      'horseName'
    ])
    expect(identifiersFor(OTHER_LIVE_MAMMALS_CODE)).toEqual([
      'animalIdentifierMicrochip',
      'animalIdentifierPassport',
      'animalIdentifierTattoo'
    ])
  })

  it('Should give no identifiers for a code that carries none', () => {
    expect(identifiersFor(OSTRICHES_CODE)).toEqual([])
    expect(identifiersFor('not-a-code')).toEqual([])
  })
})

describe('the identifier allowlists', () => {
  const derivations = [
    [
      'microchip',
      microchipCommodityCodes,
      'animalIdentifierMicrochip',
      [HORSES_CODE, OTHER_LIVE_MAMMALS_CODE]
    ],
    [
      'passport',
      passportCommodityCodes,
      'animalIdentifierPassport',
      [HORSES_CODE, CATTLE_CODE, OTHER_LIVE_MAMMALS_CODE]
    ],
    [
      'tattoo',
      tattooCommodityCodes,
      'animalIdentifierTattoo',
      [OTHER_LIVE_MAMMALS_CODE]
    ],
    ['ear tag', earTagCommodityCodes, 'animalIdentifierEarTag', [CATTLE_CODE]],
    ['horse name', horseNameCommodityCodes, 'horseName', [HORSES_CODE]]
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
      HORSES_CODE,
      CATTLE_CODE,
      OTHER_LIVE_MAMMALS_CODE
    ])
  })

  it('Should need identifying for a line whose code carries identifiers and not for one whose code does not', () => {
    expect(needsIdentifying({ commodityCode: CATTLE_CODE })).toBe(true)
    expect(needsIdentifying({ commodityCode: OSTRICHES_CODE })).toBe(false)
    expect(needsIdentifying(undefined)).toBe(false)
  })

  it('Should key every permanent-address species to an identified code', () => {
    for (const [code] of permanentAddressCodeSpecies()) {
      expect(identifiedCommodityCodes()).toContain(code)
    }
  })

  it('Should key the permanent-address species to 01061900 alone', () => {
    expect(permanentAddressCodeSpecies()).toEqual([
      [OTHER_LIVE_MAMMALS_CODE, 'Felis catus'],
      [OTHER_LIVE_MAMMALS_CODE, 'Canis familiaris'],
      [OTHER_LIVE_MAMMALS_CODE, 'Canis lupus familiaris'],
      [OTHER_LIVE_MAMMALS_CODE, 'Mustela putorius furo']
    ])
  })
})

describe('the CPH exemption', () => {
  it('Should exempt exactly the horse and cat/dog/ferret codes', () => {
    expect([...cphExemptCommodityCodes()].sort()).toEqual([
      HORSES_CODE,
      OTHER_LIVE_MAMMALS_CODE
    ])
  })
})

describe('#typeIdFor', () => {
  it('Should split cattle into Domestic and Game by species', () => {
    expect(typeIdFor(CATTLE_CODE, 'Bos taurus')).toBe('16')
    expect(typeIdFor(CATTLE_CODE, 'Bos sp.')).toBe('24')
    expect(typeIdFor(CATTLE_CODE, 'Bos spp.')).toBe('24')
  })

  it('Should give every other code its one type', () => {
    const otherCodes = packageCountCommodityCodes().filter(
      (code) => code !== CATTLE_CODE
    )
    for (const code of otherCodes) {
      expect(typeIdFor(code, 'Felis catus')).toBe('2')
      expect(typeIdFor(code, 'Bos spp.')).toBe('2')
    }
  })
})

describe('#typeTextForId', () => {
  it('Should name the cattle types Domestic and Game', () => {
    expect(typeTextForId(CATTLE_CODE, '16')).toBe('Domestic')
    expect(typeTextForId(CATTLE_CODE, '24')).toBe('Game')
  })

  it('Should give a single-type code blank text', () => {
    expect(typeTextForId(OTHER_LIVE_MAMMALS_CODE, '2')).toBe('')
  })

  it('Should give no text for a type id the code does not have', () => {
    expect(typeTextForId(CATTLE_CODE, '2')).toBeUndefined()
  })
})

describe('#commodityDescriptionFor', () => {
  it('Should give the stub MDM description for a known CN code', () => {
    expect(commodityDescriptionFor('0102')).toBe('Live bovine animals')
    expect(commodityDescriptionFor('01061900')).toBe('Other live animals')
  })

  it('Should give undefined for a code the stub does not hold', () => {
    expect(commodityDescriptionFor('9999')).toBeUndefined()
  })
})

describe('#commodityNameFor', () => {
  it('Should reverse-lookup the commodity name from a CN code', () => {
    expect(commodityNameFor('0102')).toBe('Cow')
  })

  it('Should give undefined for a code with no maintained name', () => {
    expect(commodityNameFor('01061900')).toBeUndefined()
    expect(commodityNameFor('9999')).toBeUndefined()
  })
})
