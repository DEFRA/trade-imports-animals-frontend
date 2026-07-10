import { describe, it, expect } from 'vitest'

import {
  reasonForImport,
  purposeInInternalMarket,
  transporterType,
  meansOfTransport,
  countryOfOrigin,
  commodityCode,
  internalReferenceNumber,
  transportIdentification,
  transportDocumentReference,
  cph,
  numberOfPackages,
  species,
  arrivalDateAtPort,
  transitedCountries,
  animalsCertifiedFor
} from '../obligations/obligations.js'

import {
  domain,
  reasonForImportDomain,
  purposeInInternalMarketDomain,
  transporterTypeDomain,
  meansOfTransportDomain,
  countryOfOriginDomain,
  commodityCodeDomain,
  commodityTypeDomain,
  commercialTransporterDomain,
  internalReferenceNumberDomain,
  transportIdentificationDomain,
  transportDocumentReferenceDomain,
  cphDomain,
  numberOfPackagesDomain,
  numberOfAnimalsDomain,
  SPECIES_ANIMAL_CAP,
  arrivalDateAtPortDomain,
  transitedCountriesDomain,
  animalsCertifiedForDomain,
  staticEnum,
  computedEnum,
  predicate,
  reasons
} from './index.js'
import { t } from '../lib/i18n.js'

// A trivial context-builder mirroring the shape runtime.validate builds.
const buildCtx = ({ fulfilments = {}, path = null } = {}) => ({
  fulfilments,
  path,
  siblingValue: (obligation) => {
    const stored = fulfilments[obligation.id]
    if (path === null) return stored
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      return stored[path]
    }
    return undefined
  }
})

describe('manifest', () => {
  it('keys entries by obligation id', () => {
    expect(domain.get(reasonForImport.id)).toBe(reasonForImportDomain)
    expect(domain.get(purposeInInternalMarket.id)).toBe(
      purposeInInternalMarketDomain
    )
    expect(domain.get(transporterType.id)).toBe(transporterTypeDomain)
    expect(domain.get(meansOfTransport.id)).toBe(meansOfTransportDomain)
    expect(domain.get(countryOfOrigin.id)).toBe(countryOfOriginDomain)
    expect(domain.get(commodityCode.id)).toBe(commodityCodeDomain)
    expect(domain.get(internalReferenceNumber.id)).toBe(
      internalReferenceNumberDomain
    )
    expect(domain.get(transportIdentification.id)).toBe(
      transportIdentificationDomain
    )
    expect(domain.get(transportDocumentReference.id)).toBe(
      transportDocumentReferenceDomain
    )
    expect(domain.get(cph.id)).toBe(cphDomain)
    expect(domain.get(numberOfPackages.id)).toBe(numberOfPackagesDomain)
    expect(domain.get(arrivalDateAtPort.id)).toBe(arrivalDateAtPortDomain)
    expect(domain.get(transitedCountries.id)).toBe(transitedCountriesDomain)
    expect(domain.get(animalsCertifiedFor.id)).toBe(animalsCertifiedForDomain)
  })
})

describe('staticEnum — reasonForImport', () => {
  it('returns the fixed options regardless of state', () => {
    expect(reasonForImportDomain.type).toBe('enum')
    expect(reasonForImportDomain.options({})).toContain('internal-market')
    expect(reasonForImportDomain.options({ anything: 'goes' })).toEqual(
      reasonForImportDomain.options({})
    )
  })

  it('attaches shape + labels metadata (labels are message keys)', () => {
    expect(reasonForImportDomain.metadata.shape).toBe('staticEnum')
    // Labels values are message keys — resolve via t() to check both
    // that the key is set and that en.json carries the copy.
    expect(t(reasonForImportDomain.labels['internal-market'])).toBe(
      'Internal market'
    )
  })
})

describe('computedEnum — purposeInInternalMarket', () => {
  it('returns internal-market sub-values when reason is internal-market', () => {
    const options = purposeInInternalMarketDomain.options({
      [reasonForImport.id]: 'internal-market'
    })
    expect(options).toEqual(['breeding', 'slaughter', 'fattening', 'other'])
  })

  it('returns [] when reason is anything else or unset', () => {
    expect(
      purposeInInternalMarketDomain.options({
        [reasonForImport.id]: 'transit-through-eu'
      })
    ).toEqual([])
    expect(purposeInInternalMarketDomain.options({})).toEqual([])
  })

  it('declares readsFrom in metadata', () => {
    expect(purposeInInternalMarketDomain.metadata.readsFrom).toEqual([
      'reasonForImport'
    ])
  })

  it('exposes labels for the sub-values', () => {
    expect(t(purposeInInternalMarketDomain.labels.breeding)).toBe('Breeding')
  })
})

describe('staticEnum — countryOfOrigin', () => {
  it('offers at least the 25 country options needed to exercise the > 12 cap on transitedCountries', () => {
    const options = countryOfOriginDomain.options({})
    expect(options.length).toBeGreaterThanOrEqual(13)
    expect(options).toContain('FR')
    expect(t(countryOfOriginDomain.labels.FR)).toBe('France')
  })
})

describe('staticEnum — commodityCode', () => {
  it('covers every whitelisted V4 code the obligations manifest gates on', () => {
    const options = commodityCodeDomain.options({})
    expect(options).toEqual(
      expect.arrayContaining([
        '0101',
        '0102',
        '0103',
        '010410',
        '010420',
        '01061900'
      ])
    )
    expect(t(commodityCodeDomain.labels['0102'])).toContain('Cattle')
  })
})

describe('addressBlock — commercialTransporter (step 4 iteration 7)', () => {
  it('exposes type/subFields/required metadata for the widget layer', () => {
    expect(commercialTransporterDomain.type).toBe('address')
    expect(commercialTransporterDomain.subFields).toEqual([
      'name',
      'addressLine1',
      'town',
      'postcode'
    ])
    expect(commercialTransporterDomain.required).toEqual([
      'name',
      'addressLine1',
      'town',
      'postcode'
    ])
    expect(commercialTransporterDomain.metadata.shape).toBe('addressBlock')
  })

  it('passes an all-filled composite value', () => {
    expect(
      commercialTransporterDomain.predicate(
        {
          name: 'ACME',
          addressLine1: 'Farm Lane',
          town: 'Exeter',
          postcode: 'EX1 1AA'
        },
        buildCtx()
      )
    ).toEqual([])
  })

  it('passes undefined / null — blank is handled upstream, not here', () => {
    expect(
      commercialTransporterDomain.predicate(undefined, buildCtx())
    ).toEqual([])
    expect(commercialTransporterDomain.predicate(null, buildCtx())).toEqual([])
  })

  it('emits one addressSubFieldRequired error per empty required sub-field', () => {
    const errs = commercialTransporterDomain.predicate(
      { name: 'ACME', addressLine1: '', town: '', postcode: 'EX1 1AA' },
      buildCtx()
    )
    expect(errs).toHaveLength(2)
    expect(errs.map((e) => e.subField).sort()).toEqual(['addressLine1', 'town'])
    for (const err of errs) {
      expect(err.code).toBe(reasons.addressSubFieldRequired.code)
      expect(err.obligation).toBe('commercialTransporter')
    }
  })

  it('rejects a non-object composite value gracefully (returns [])', () => {
    // Widget layer should never send a non-object, but the predicate
    // must not crash on unexpected input.
    expect(
      commercialTransporterDomain.predicate('a string', buildCtx())
    ).toEqual([])
    expect(
      commercialTransporterDomain.predicate(['array', 'value'], buildCtx())
    ).toEqual([])
  })
})

describe('staticEnum — commodityType (step 4 iteration 6)', () => {
  it('exposes a small closed enum of commodity-type codes', () => {
    const options = commodityTypeDomain.options({})
    expect(options).toEqual([
      'meat-producing',
      'dairy-producing',
      'breeding-stock',
      'other'
    ])
  })

  it('every code resolves to a human label via t()', () => {
    for (const code of commodityTypeDomain.options({})) {
      const resolved = t(commodityTypeDomain.labels[code])
      // Resolved to English string — not the raw dotted-path.
      expect(resolved).not.toContain('domain.commodityType')
      expect(typeof resolved).toBe('string')
    }
  })

  it('resolves labels for each specific code', () => {
    expect(t(commodityTypeDomain.labels['meat-producing'])).toBe(
      'Meat-producing'
    )
    expect(t(commodityTypeDomain.labels['dairy-producing'])).toBe(
      'Dairy-producing'
    )
    expect(t(commodityTypeDomain.labels['breeding-stock'])).toBe(
      'Breeding stock'
    )
    expect(t(commodityTypeDomain.labels.other)).toBe('Other')
  })
})

describe('predicate — internalReferenceNumber (V4: string max 58)', () => {
  it('passes an empty or short string', () => {
    expect(internalReferenceNumberDomain.predicate('', buildCtx())).toEqual([])
    expect(
      internalReferenceNumberDomain.predicate('ABC123', buildCtx())
    ).toEqual([])
  })

  it('passes exactly 58 characters', () => {
    expect(
      internalReferenceNumberDomain.predicate('x'.repeat(58), buildCtx())
    ).toEqual([])
  })

  it('rejects 59 characters', () => {
    const errs = internalReferenceNumberDomain.predicate(
      'x'.repeat(59),
      buildCtx()
    )
    expect(errs).toHaveLength(1)
    expect(errs[0].code).toBe(reasons.stringMaxLength.code)
    expect(errs[0].max).toBe(58)
    expect(errs[0].actual).toBe(59)
  })
})

describe('predicate — transportIdentification / transportDocumentReference (V4: string max 58)', () => {
  it('applies the same 58-char cap', () => {
    expect(
      transportIdentificationDomain.predicate('x'.repeat(59), buildCtx())[0]
        .code
    ).toBe(reasons.stringMaxLength.code)
    expect(
      transportDocumentReferenceDomain.predicate('x'.repeat(59), buildCtx())[0]
        .code
    ).toBe(reasons.stringMaxLength.code)
  })
})

describe('predicate — cph (V4: string max 11)', () => {
  it('passes a valid short CPH', () => {
    expect(cphDomain.predicate('12/345/6789', buildCtx())).toEqual([])
  })

  it('rejects > 11 characters', () => {
    expect(cphDomain.predicate('123456789012', buildCtx())[0].code).toBe(
      reasons.stringMaxLength.code
    )
  })
})

describe('predicate — numberOfPackages (V4: integer, max 10 digits)', () => {
  it('passes 1', () => {
    expect(numberOfPackagesDomain.predicate(1, buildCtx())).toEqual([])
  })

  it('rejects 0 and negatives', () => {
    expect(numberOfPackagesDomain.predicate(0, buildCtx())[0].code).toBe(
      reasons.integerMin.code
    )
    expect(numberOfPackagesDomain.predicate(-3, buildCtx())[0].code).toBe(
      reasons.integerMin.code
    )
  })

  it('rejects non-integers', () => {
    expect(numberOfPackagesDomain.predicate(1.5, buildCtx())[0].code).toBe(
      reasons.integerMin.code
    )
  })

  it('rejects > 10 digits', () => {
    expect(
      numberOfPackagesDomain.predicate(10_000_000_000, buildCtx())[0].code
    ).toBe(reasons.integerMaxDigits.code)
  })

  it('passes an empty / unset value — numberOfPackages is completion-optional', () => {
    // Regression guard: Change-loop on the optional field must not
    // 400. See NEXT.md resolved-limitation block on optional-only
    // page completion.
    expect(numberOfPackagesDomain.predicate(undefined, buildCtx())).toEqual([])
    expect(numberOfPackagesDomain.predicate('', buildCtx())).toEqual([])
    expect(numberOfPackagesDomain.predicate(null, buildCtx())).toEqual([])
  })
})

describe('predicate — numberOfAnimals (V4: integer, per-species cap)', () => {
  const line1 = { path: 'line1' }
  const ctxWithSpecies = (selected) =>
    buildCtx({
      fulfilments: { [species.id]: { line1: selected } },
      path: 'line1'
    })

  it('passes an empty / unset value (mandatory-blank is caught upstream, not here)', () => {
    expect(numberOfAnimalsDomain.predicate(undefined, buildCtx(line1))).toEqual(
      []
    )
    expect(numberOfAnimalsDomain.predicate('', buildCtx(line1))).toEqual([])
  })

  it('rejects 0 and negatives with integerMin', () => {
    expect(numberOfAnimalsDomain.predicate(0, buildCtx(line1))[0].code).toBe(
      reasons.integerMin.code
    )
    expect(numberOfAnimalsDomain.predicate(-5, buildCtx(line1))[0].code).toBe(
      reasons.integerMin.code
    )
  })

  it('rejects non-integers with integerMin', () => {
    expect(numberOfAnimalsDomain.predicate(1.5, buildCtx(line1))[0].code).toBe(
      reasons.integerMin.code
    )
  })

  it('passes when no species selected (no cap to enforce)', () => {
    expect(numberOfAnimalsDomain.predicate(5000, buildCtx(line1))).toEqual([])
  })

  it('passes a value under the per-species cap for a single species', () => {
    // Cattle cap 300.
    expect(
      numberOfAnimalsDomain.predicate(25, ctxWithSpecies(['cattle']))
    ).toEqual([])
  })

  it('rejects a value over the per-species cap with the speciesCap code', () => {
    // Cattle cap 300 — 500 exceeds.
    const errs = numberOfAnimalsDomain.predicate(
      500,
      ctxWithSpecies(['cattle'])
    )
    expect(errs).toHaveLength(1)
    expect(errs[0].code).toBe(reasons.numberOfAnimalsSpeciesCap.code)
    expect(errs[0].max).toBe(300)
    expect(errs[0].actual).toBe(500)
  })

  it('applies the MIN cap across a multi-species selection', () => {
    // Cattle 300 + buffalo 300 → 300. 400 exceeds.
    expect(
      numberOfAnimalsDomain.predicate(
        400,
        ctxWithSpecies(['cattle', 'buffalo'])
      )[0].code
    ).toBe(reasons.numberOfAnimalsSpeciesCap.code)
  })

  it('a small-animal species (rabbit cap 100) enforces its lower cap on a mixed line', () => {
    // Cattle 300 + rabbit 100 → line cap 100. 150 exceeds.
    const errs = numberOfAnimalsDomain.predicate(
      150,
      ctxWithSpecies(['cattle', 'rabbit'])
    )
    expect(errs[0].max).toBe(100)
  })

  it('does not cross-contaminate between lines', () => {
    // line1 species = owl (cap 20); check that line2 with cattle (300)
    // is not affected by line1.
    const st = buildCtx({
      fulfilments: { [species.id]: { line1: ['owl'], line2: ['cattle'] } },
      path: 'line2'
    })
    expect(numberOfAnimalsDomain.predicate(200, st)).toEqual([])
  })

  it('SPECIES_ANIMAL_CAP covers every species option in SPECIES_LABELS territory', () => {
    // Guard: if step 4 later adds a new species, the cap map must be
    // extended so we don't silently miss a species during validation.
    const expected = [
      'horse',
      'cattle',
      'buffalo',
      'bison',
      'pig',
      'wild-boar',
      'sheep',
      'lamb',
      'goat',
      'dog',
      'cat',
      'ferret',
      'rabbit',
      'owl',
      'falcon',
      'eagle',
      'other-bird-of-prey',
      'bee'
    ]
    for (const s of expected) {
      expect(typeof SPECIES_ANIMAL_CAP[s]).toBe('number')
    }
  })
})

describe('predicate — arrivalDateAtPort (V4: DD/MM/YYYY)', () => {
  it('passes a valid date', () => {
    expect(arrivalDateAtPortDomain.predicate('12/12/2026', buildCtx())).toEqual(
      []
    )
    expect(arrivalDateAtPortDomain.predicate('29/02/2024', buildCtx())).toEqual(
      []
    )
  })

  it('passes empty / unset (validation is length + format only; presence is an obligation-scope concern)', () => {
    expect(arrivalDateAtPortDomain.predicate('', buildCtx())).toEqual([])
    expect(arrivalDateAtPortDomain.predicate(undefined, buildCtx())).toEqual([])
  })

  it('rejects a non-DD/MM/YYYY string', () => {
    expect(
      arrivalDateAtPortDomain.predicate('2026-12-12', buildCtx())[0].code
    ).toBe(reasons.dateFormat.code)
    expect(
      arrivalDateAtPortDomain.predicate('not-a-date', buildCtx())[0].code
    ).toBe(reasons.dateFormat.code)
  })

  it('rejects invalid calendar dates', () => {
    expect(
      arrivalDateAtPortDomain.predicate('31/02/2026', buildCtx())[0].code
    ).toBe(reasons.dateFormat.code)
    expect(
      arrivalDateAtPortDomain.predicate('29/02/2023', buildCtx())[0].code
    ).toBe(reasons.dateFormat.code)
  })
})

describe('transitedCountriesDomain (V4: multi-select max 12)', () => {
  it('is an enum with a preset option list', () => {
    expect(transitedCountriesDomain.type).toBe('enum')
    const options = transitedCountriesDomain.options({})
    expect(options).toContain('FR')
    expect(options).toContain('DE')
  })

  it('passes when 12 or fewer selected', () => {
    expect(
      transitedCountriesDomain.predicate(['FR', 'DE', 'IT'], buildCtx())
    ).toEqual([])
    expect(
      transitedCountriesDomain.predicate(
        [
          'FR',
          'DE',
          'IT',
          'ES',
          'PT',
          'BE',
          'NL',
          'LU',
          'AT',
          'CH',
          'SE',
          'NO'
        ],
        buildCtx()
      )
    ).toEqual([])
  })

  it('rejects when 13 or more selected', () => {
    const errs = transitedCountriesDomain.predicate(
      [
        'FR',
        'DE',
        'IT',
        'ES',
        'PT',
        'BE',
        'NL',
        'LU',
        'AT',
        'CH',
        'SE',
        'NO',
        'DK'
      ],
      buildCtx()
    )
    expect(errs[0].code).toBe(reasons.arrayMaxSelections.code)
    expect(errs[0].max).toBe(12)
    expect(errs[0].actual).toBe(13)
  })

  it('carries max metadata for the data dictionary', () => {
    expect(transitedCountriesDomain.metadata.max).toBe(12)
  })
})

describe('staticEnum — animalsCertifiedFor', () => {
  it('returns the four stubbed options regardless of state', () => {
    expect(animalsCertifiedForDomain.options({})).toEqual([
      'bovine',
      'ovine',
      'porcine',
      'equine'
    ])
  })

  it('carries human labels for the option codes (via message keys)', () => {
    // Under the i18n refactor, `labels` values are message keys that
    // resolve via t() to the English strings.
    const labels = animalsCertifiedForDomain.labels
    expect(t(labels.bovine)).toBe('Cattle')
    expect(t(labels.ovine)).toBe('Sheep')
    expect(t(labels.porcine)).toBe('Pigs')
    expect(t(labels.equine)).toBe('Horses')
  })

  it('names its shape as staticEnum in metadata', () => {
    expect(animalsCertifiedForDomain.metadata.shape).toBe('staticEnum')
  })
})

describe('factories', () => {
  it('staticEnum ignores state and takes optional labels', () => {
    const e = staticEnum(['x', 'y'], { labels: { x: 'Ex', y: 'Why' } })
    expect(e.options()).toEqual(['x', 'y'])
    expect(e.labels).toEqual({ x: 'Ex', y: 'Why' })
  })

  it('computedEnum forwards state to the closure', () => {
    const e = computedEnum((f) => (f.flag ? ['a'] : ['b']))
    expect(e.options({ flag: true })).toEqual(['a'])
    expect(e.options({})).toEqual(['b'])
  })

  it('predicate carries reason codes on metadata', () => {
    const r = { code: 'x.y', explanation: '' }
    const e = predicate('integer', () => [], [r])
    expect(e.metadata.reasons).toEqual(['x.y'])
  })
})
