import { describe, it, expect, beforeAll } from 'vitest'
import { createObligationEvaluator } from '../../../model/obligations/evaluator.js'
import {
  obligations,
  commodityCode,
  numberOfPackages,
  cph,
  containsUnweanedAnimals,
  microchip,
  passport,
  tattoo,
  earTag,
  horseName,
  permanentAddress,
  speciesLatinName
} from './index.js'
import {
  cphExemptCommodityCodes,
  earTagCommodityCodes,
  horseNameCommodityCodes,
  microchipCommodityCodes,
  packageCountCommodityCodes,
  passportCommodityCodes,
  permanentAddressCodeSpecies,
  tattooCommodityCodes,
  unweanedCommodityCodes
} from '../services/commodities/index.js'

const UNLISTED_VALUE = 'Unicorn'

let evaluate
beforeAll(() => {
  const evaluator = createObligationEvaluator({ obligations })
  evaluate = (fulfilments) => evaluator.evaluate(fulfilments)
})

describe('package-count list → numberOfPackages (line-scoped)', () => {
  for (const code of packageCountCommodityCodes()) {
    it(`Should put numberOfPackages in scope for a line with code = '${code}'`, () => {
      const state = evaluate({
        [commodityCode.id]: { line1: code }
      })
      const fulfilmentIndexes =
        state.obligations[numberOfPackages.id].fulfilmentIndexes ?? []
      expect(fulfilmentIndexes).toContain('line1')
    })
  }

  it(`Should not put numberOfPackages in scope for a control value`, () => {
    const state = evaluate({
      [commodityCode.id]: { line1: UNLISTED_VALUE }
    })
    const fulfilmentIndexes =
      state.obligations[numberOfPackages.id].fulfilmentIndexes ?? []
    expect(fulfilmentIndexes).toEqual([])
  })
})

describe('CPH exemptions → cph (top-level anyNotInUnionOf)', () => {
  for (const code of cphExemptCommodityCodes()) {
    it(`Should not put cph in scope for a consignment of code '${code}' alone`, () => {
      const state = evaluate({
        [commodityCode.id]: { line1: code }
      })
      expect(state.obligations[cph.id].inScope).toBe(false)
    })
  }

  it('Should not put cph in scope when every line is exempt', () => {
    const state = evaluate({
      [commodityCode.id]: { line1: '0101', line2: '01061900' }
    })
    expect(state.obligations[cph.id].inScope).toBe(false)
  })

  it('Should put cph in scope when any line is not exempt', () => {
    const state = evaluate({
      [commodityCode.id]: { line1: '0101', line2: '0103' }
    })
    expect(state.obligations[cph.id].inScope).toBe(true)
  })

  it('Should put cph in scope for a code on no list at all', () => {
    const state = evaluate({
      [commodityCode.id]: { line1: UNLISTED_VALUE }
    })
    expect(state.obligations[cph.id].inScope).toBe(true)
  })

  it('Should not put cph in scope before any line has a code', () => {
    const state = evaluate({})
    expect(state.obligations[cph.id].inScope).toBe(false)
  })
})

describe('unweaned list → containsUnweanedAnimals (top-level anyAllowListed)', () => {
  for (const code of unweanedCommodityCodes()) {
    it(`Should put containsUnweanedAnimals in scope when a line has code = '${code}'`, () => {
      const state = evaluate({
        [commodityCode.id]: { line1: code }
      })
      expect(state.obligations[containsUnweanedAnimals.id].inScope).toBe(true)
    })
  }

  it(`Should not put containsUnweanedAnimals in scope when no line matches`, () => {
    const state = evaluate({
      [commodityCode.id]: { line1: UNLISTED_VALUE }
    })
    expect(state.obligations[containsUnweanedAnimals.id].inScope).toBe(false)
  })

  it('Should not put containsUnweanedAnimals in scope for a horses-only consignment', () => {
    const state = evaluate({
      [commodityCode.id]: { line1: '0101' }
    })
    expect(state.obligations[containsUnweanedAnimals.id].inScope).toBe(false)
  })
})

const UNIT_SCOPED_ALLOWLISTS = [
  {
    name: 'microchip list',
    gate: commodityCode,
    values: microchipCommodityCodes(),
    gated: microchip
  },
  {
    name: 'passport list',
    gate: commodityCode,
    values: passportCommodityCodes(),
    gated: passport
  },
  {
    name: 'tattoo list',
    gate: commodityCode,
    values: tattooCommodityCodes(),
    gated: tattoo
  },
  {
    name: 'ear-tag list',
    gate: commodityCode,
    values: earTagCommodityCodes(),
    gated: earTag
  },
  {
    name: 'horse-name list',
    gate: commodityCode,
    values: horseNameCommodityCodes(),
    gated: horseName
  }
]

for (const { name, gate, values, gated } of UNIT_SCOPED_ALLOWLISTS) {
  describe(`${name} → ${gated.name} (unit-record-scoped)`, () => {
    for (const value of values) {
      it(`Should put ${gated.name} in scope for a unit under ${gate.name} = '${value}'`, () => {
        const state = evaluate({
          [gate.id]: { line1: value },
          [gated.id]: { 'line1.unit1': '' }
        })
        const fulfilmentIndexes =
          state.obligations[gated.id].fulfilmentIndexes ?? []
        expect(fulfilmentIndexes).toContain('line1.unit1')
      })
    }

    it(`Should not put ${gated.name} in scope for a control value`, () => {
      const state = evaluate({
        [gate.id]: { line1: UNLISTED_VALUE },
        [gated.id]: { 'line1.unit1': '' }
      })
      const fulfilmentIndexes =
        state.obligations[gated.id].fulfilmentIndexes ?? []
      expect(fulfilmentIndexes).toEqual([])
    })
  })
}

describe('permanent-address list → permanentAddress (unit-record-scoped)', () => {
  const permanentAddressIndexesFor = (code, latinName) =>
    evaluate({
      [commodityCode.id]: { line1: code },
      [speciesLatinName.id]: { line1: latinName },
      [permanentAddress.id]: { 'line1.unit1': '' }
    }).obligations[permanentAddress.id].fulfilmentIndexes ?? []

  for (const [code, latinName] of permanentAddressCodeSpecies()) {
    it(`Should put permanentAddress in scope for a unit of ${latinName} under ${code}`, () => {
      expect(permanentAddressIndexesFor(code, latinName)).toContain(
        'line1.unit1'
      )
    })
  }

  it('Should not put permanentAddress in scope for the genus Felis under 01061900', () => {
    expect(permanentAddressIndexesFor('01061900', 'Felis')).toEqual([])
  })

  it('Should not put permanentAddress in scope for a listed species under another code', () => {
    expect(permanentAddressIndexesFor('0102', 'Felis catus')).toEqual([])
  })
})

const EXPECTED = {
  'package-count list': [
    '0101',
    '0102',
    '0103',
    '010410',
    '010420',
    '01051111',
    '01051200',
    '01051300',
    '01051400',
    '01051500',
    '01059400',
    '01059910',
    '01059920',
    '01059930',
    '01059950',
    '01061410',
    '01061900',
    '01062000',
    '01063100',
    '01063200',
    '01063980',
    '01064100',
    '01064900'
  ],
  'CPH exemptions': ['0101', '01061900'],
  'unweaned list': ['0102'],
  'microchip list': ['0101', '01061900'],
  'passport list': ['0101', '0102', '01061900'],
  'tattoo list': ['01061900'],
  'ear-tag list': ['0102'],
  'horse-name list': ['0101'],
  'permanent-address list': [
    ['01061900', 'Canis familiaris'],
    ['01061900', 'Canis lupus familiaris'],
    ['01061900', 'Felis catus'],
    ['01061900', 'Mustela putorius furo']
  ]
}

const ALLOWLISTS_UNDER_TEST = [
  { name: 'package-count list', values: packageCountCommodityCodes() },
  { name: 'CPH exemptions', values: cphExemptCommodityCodes() },
  { name: 'unweaned list', values: unweanedCommodityCodes() },
  { name: 'microchip list', values: microchipCommodityCodes() },
  { name: 'passport list', values: passportCommodityCodes() },
  { name: 'tattoo list', values: tattooCommodityCodes() },
  { name: 'ear-tag list', values: earTagCommodityCodes() },
  { name: 'horse-name list', values: horseNameCommodityCodes() },
  { name: 'permanent-address list', values: permanentAddressCodeSpecies() }
]

describe('anti-drift — every allowlist matches its expected shape', () => {
  for (const { name, values } of ALLOWLISTS_UNDER_TEST) {
    it(`Should have the ${name} contain exactly the expected values`, () => {
      expect([...values].sort()).toEqual([...EXPECTED[name]].sort())
    })
  }
})
