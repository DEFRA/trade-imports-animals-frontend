import { describe, expect, it } from 'vitest'

import {
  cphExemptCommodityCodes,
  earTagCommodityCodes,
  horseNameCommodityCodes,
  identifiedCommodityCodes,
  identifiersFor,
  microchipCommodityCodes,
  passportCommodityCodes,
  permanentAddressCodeSpecies,
  listsSpeciesIndividually,
  tattooCommodityCodes,
  typeIdFor,
  typeTextForId
} from './index.js'
import { search } from './search.js'

const CATTLE = '0102'
const HORSES = '0101'
const OTHER_MAMMALS = '01061900'
const OSTRICHES = '01063300'

describe('#search', () => {
  it('Should find a species by its common name, under its code', async () => {
    const results = await search('ferret', { size: 10 })
    expect(results).toEqual({
      total: 1,
      page: 0,
      size: 10,
      groups: [
        {
          code: OTHER_MAMMALS,
          species: [
            { latinName: 'Mustela putorius furo', commonName: 'Ferret' }
          ]
        }
      ]
    })
  })

  it('Should list every species of a code found by its code, a page at a time', async () => {
    const results = await search(CATTLE, { size: 10 })
    expect(results.total).toBe(15)
    expect(results.groups).toHaveLength(1)
    expect(results.groups[0].species).toHaveLength(10)

    const secondPage = await search(CATTLE, { page: 1, size: 10 })
    expect(secondPage.groups[0].species).toHaveLength(5)
  })

  it('Should find a species by any word of its Latin name', async () => {
    const results = await search('taurus', { size: 10 })
    expect(results.groups.map((group) => group.code)).toEqual([
      CATTLE,
      OTHER_MAMMALS
    ])
  })

  it('Should find nothing for a term that matches nothing', async () => {
    const results = await search('unicorn', { size: 10 })
    expect(results).toEqual({ total: 0, page: 0, size: 10, groups: [] })
  })
})

describe('#listsSpeciesIndividually', () => {
  it('Should hold for code 01061900 and for no other', () => {
    expect(listsSpeciesIndividually(OTHER_MAMMALS)).toBe(true)
    expect(listsSpeciesIndividually(CATTLE)).toBe(false)
    expect(listsSpeciesIndividually(HORSES)).toBe(false)
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

// The per-identifier allowlists the obligation gates read are derived from the
// same per-code lists, so a code's identifiers and its gates are one edit, not
// two that can disagree.
describe('the identifier allowlists', () => {
  const derivations = [
    ['microchip', microchipCommodityCodes, 'animalIdentifierMicrochip'],
    ['passport', passportCommodityCodes, 'animalIdentifierPassport'],
    ['tattoo', tattooCommodityCodes, 'animalIdentifierTattoo'],
    ['ear tag', earTagCommodityCodes, 'animalIdentifierEarTag'],
    ['horse name', horseNameCommodityCodes, 'horseName']
  ]

  for (const [name, allowlist, identifier] of derivations) {
    it(`Should list only codes that carry the ${name}`, () => {
      for (const code of allowlist()) {
        expect(identifiersFor(code)).toContain(identifier)
      }
      expect(allowlist()).not.toContain(OSTRICHES)
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
    expect(typeIdFor(OTHER_MAMMALS, 'Felis catus')).toBe('2')
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
