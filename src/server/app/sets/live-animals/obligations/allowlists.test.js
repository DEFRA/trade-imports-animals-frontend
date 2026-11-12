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
  permanentAddressOrigin,
  speciesLatinName
} from './index.js'
import {
  cphExemptCommodityCodes,
  earTagCommodityCodes,
  horseNameCodeSpecies,
  microchipCommodityCodes,
  packageCountCommodityCodes,
  passportCommodityCodes,
  permanentAddressCodeSpecies,
  tattooCommodityCodes,
  unweanedCommodityCodes
} from '../services/commodities/index.js'
import { COMMODITY_GROUPS } from '../services/commodities/stub.js'

const UNLISTED_VALUE = 'Unicorn'
const UNIT_1_FULFILMENT_INDEX = 'line1.unit1'

const PERMANENT_ADDRESS_REASONS = {
  permanentAddress: {
    code: 'obligation.permanentAddress.applicable.becausePermanentAddressLine',
    explanation:
      'permanentAddress applies on units of lines whose commodityCode and species pair is in the permanent-address list'
  },
  permanentAddressOrigin: {
    code: 'obligation.permanentAddressOrigin.applicable.becausePermanentAddressLine',
    explanation:
      'permanentAddressOrigin applies on units of lines whose commodityCode and species pair is in the permanent-address list'
  }
}

const HORSE_NAME_REASON = {
  code: 'obligation.horseName.applicable.becauseHorseCommodity',
  explanation:
    'horseName applies on units of lines whose commodityCode and species pair is in the horse-name list'
}

let evaluate
beforeAll(() => {
  const evaluator = createObligationEvaluator({ obligations })
  evaluate = (fulfilments) => evaluator.evaluate(fulfilments)
})

describe('package-count list → numberOfPackages (line-scoped)', () => {
  const servedCommodityCodes = COMMODITY_GROUPS.map((group) => group.code)

  const isInNumberOfPackagesScope = (code) => {
    const state = evaluate({
      [commodityCode.id]: { line1: code }
    })
    const fulfilmentIndexes =
      state.obligations[numberOfPackages.id].fulfilmentIndexes ?? []
    return fulfilmentIndexes.includes('line1')
  }

  for (const code of servedCommodityCodes) {
    it(`Should put numberOfPackages in scope for a line with code = '${code}' only when the code is on the package-count list`, () => {
      expect(isInNumberOfPackagesScope(code)).toBe(
        packageCountCommodityCodes().includes(code)
      )
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

  it('Should leave rabbits other than domestic, ratites and pigeons out of numberOfPackages scope, and no other served code', () => {
    const codesOutOfScope = servedCommodityCodes.filter(
      (code) => !isInNumberOfPackagesScope(code)
    )
    expect([...codesOutOfScope].sort()).toEqual([
      '01061490',
      '01063300',
      '01063910'
    ])
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

  it('Should not put containsUnweanedAnimals in scope for a cats-dogs-ferrets-only consignment', () => {
    const state = evaluate({
      [commodityCode.id]: { line1: '01061900' }
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
  }
]

for (const { name, gate, values, gated } of UNIT_SCOPED_ALLOWLISTS) {
  describe(`${name} → ${gated.name} (unit-record-scoped)`, () => {
    for (const value of values) {
      it(`Should put ${gated.name} in scope for a unit under ${gate.name} = '${value}'`, () => {
        const state = evaluate({
          [gate.id]: { line1: value },
          [gated.id]: { [UNIT_1_FULFILMENT_INDEX]: '' }
        })
        const fulfilmentIndexes =
          state.obligations[gated.id].fulfilmentIndexes ?? []
        expect(fulfilmentIndexes).toContain(UNIT_1_FULFILMENT_INDEX)
      })
    }

    it(`Should not put ${gated.name} in scope for a control value`, () => {
      const state = evaluate({
        [gate.id]: { line1: UNLISTED_VALUE },
        [gated.id]: { [UNIT_1_FULFILMENT_INDEX]: '' }
      })
      const fulfilmentIndexes =
        state.obligations[gated.id].fulfilmentIndexes ?? []
      expect(fulfilmentIndexes).toEqual([])
    })
  })
}

describe.each([
  ['permanentAddress', permanentAddress],
  ['permanentAddressOrigin', permanentAddressOrigin]
])('permanent-address list → %s (unit-record-scoped)', (_name, obligation) => {
  const decisionFor = (code, latinName) =>
    evaluate({
      [commodityCode.id]: { line1: code },
      [speciesLatinName.id]: { line1: latinName },
      [obligation.id]: { [UNIT_1_FULFILMENT_INDEX]: '' }
    }).obligations[obligation.id]

  const indexesFor = (code, latinName) =>
    decisionFor(code, latinName).fulfilmentIndexes ?? []

  for (const [code, latinName] of permanentAddressCodeSpecies()) {
    it(`Should put ${obligation.name} in scope for a unit of ${latinName} under ${code}`, () => {
      expect(indexesFor(code, latinName)).toContain(UNIT_1_FULFILMENT_INDEX)
      expect(decisionFor(code, latinName).reasons).toEqual([
        PERMANENT_ADDRESS_REASONS[obligation.name]
      ])
    })
  }

  it(`Should not put ${obligation.name} in scope for the genus Felis under 01061900`, () => {
    expect(indexesFor('01061900', 'Felis')).toEqual([])
  })

  it(`Should not put ${obligation.name} in scope for a listed species under another code`, () => {
    expect(indexesFor('0102', 'Felis catus')).toEqual([])
  })

  it(`Should not put ${obligation.name} in scope for a species that is not listed`, () => {
    expect(indexesFor('01061900', 'Mustela nigripes')).toEqual([])
  })
})

describe('horse-name list → horseName (unit-record-scoped, pair-gated)', () => {
  const decisionFor = (code, latinName) =>
    evaluate({
      [commodityCode.id]: { line1: code },
      [speciesLatinName.id]: { line1: latinName },
      [horseName.id]: { [UNIT_1_FULFILMENT_INDEX]: '' }
    }).obligations[horseName.id]

  const indexesFor = (code, latinName) =>
    decisionFor(code, latinName).fulfilmentIndexes ?? []

  for (const [code, latinName] of horseNameCodeSpecies()) {
    it(`Should put horseName in scope for a unit of ${latinName} under ${code}`, () => {
      expect(indexesFor(code, latinName)).toContain(UNIT_1_FULFILMENT_INDEX)
      expect(decisionFor(code, latinName).reasons).toEqual([HORSE_NAME_REASON])
    })
  }

  it('Should not put horseName in scope for the donkey species under 0101', () => {
    expect(indexesFor('0101', 'Equus asinus')).toEqual([])
  })

  it('Should not put horseName in scope for the horse species under another code', () => {
    expect(indexesFor('0102', 'Equus cabalus')).toEqual([])
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
  'unweaned list': ['0101', '0102', '0103', '010410', '010420'],
  'microchip list': ['0101', '01061900'],
  'passport list': ['0101', '0102', '01061900'],
  'tattoo list': ['0102', '0103', '01061900'],
  'ear-tag list': ['0102', '0103', '010410', '010420'],
  'horse-name list': [['0101', 'Equus cabalus']],
  'permanent-address list': [
    ['01061900', 'Felis catus'],
    ['01061900', 'Canis familiaris'],
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
  { name: 'horse-name list', values: horseNameCodeSpecies() },
  { name: 'permanent-address list', values: permanentAddressCodeSpecies() }
]

describe('anti-drift — every allowlist matches its expected shape', () => {
  for (const { name, values } of ALLOWLISTS_UNDER_TEST) {
    it(`Should have the ${name} contain exactly the expected values`, () => {
      expect([...values].sort()).toEqual([...EXPECTED[name]].sort())
    })
  }
})
