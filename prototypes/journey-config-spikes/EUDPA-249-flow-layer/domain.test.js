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
  arrivalDateAtPort,
  transitedCountries,
  animalsCertifiedFor
} from '../../model-spikes/obligations-v4-model/obligations.js'

import {
  domain,
  reasonForImportDomain,
  purposeInInternalMarketDomain,
  transporterTypeDomain,
  meansOfTransportDomain,
  countryOfOriginDomain,
  commodityCodeDomain,
  internalReferenceNumberDomain,
  transportIdentificationDomain,
  transportDocumentReferenceDomain,
  cphDomain,
  numberOfPackagesDomain,
  arrivalDateAtPortDomain,
  transitedCountriesDomain,
  animalsCertifiedForDomain,
  certifiedForOptionsLookup,
  staticEnum,
  computedEnum,
  lookupEnum,
  predicate,
  reasons
} from './domain.js'

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

  it('attaches shape + labels metadata', () => {
    expect(reasonForImportDomain.metadata.shape).toBe('staticEnum')
    expect(reasonForImportDomain.labels['internal-market']).toBe(
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
    expect(purposeInInternalMarketDomain.labels.breeding).toBe('Breeding')
  })
})

describe('staticEnum — countryOfOrigin', () => {
  it('offers at least the 25 country options needed to exercise the > 12 cap on transitedCountries', () => {
    const options = countryOfOriginDomain.options({})
    expect(options.length).toBeGreaterThanOrEqual(13)
    expect(options).toContain('FR')
    expect(countryOfOriginDomain.labels.FR).toBe('France')
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
    expect(commodityCodeDomain.labels['0102']).toContain('Cattle')
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

describe('lookupEnum — animalsCertifiedFor', () => {
  it('returns options fetched by the orchestrator', () => {
    const options = animalsCertifiedForDomain.options({
      [certifiedForOptionsLookup.id]: ['bovine', 'ovine']
    })
    expect(options).toEqual(['bovine', 'ovine'])
  })

  it('returns [] before the lookup is fulfilled', () => {
    expect(animalsCertifiedForDomain.options({})).toEqual([])
  })

  it('names the lookup obligation in metadata', () => {
    expect(animalsCertifiedForDomain.metadata.shape).toBe('lookupEnum')
    expect(animalsCertifiedForDomain.metadata.lookupObligation).toBe(
      'certifiedForOptionsLookup'
    )
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

  it('lookupEnum reads from the given obligation id', () => {
    const dummy = { id: 'dummy-lookup', name: 'dummy' }
    const e = lookupEnum(dummy)
    expect(e.options({ [dummy.id]: ['v1'] })).toEqual(['v1'])
    expect(e.options({})).toEqual([])
  })

  it('predicate carries reason codes on metadata', () => {
    const r = { code: 'x.y', explanation: '' }
    const e = predicate('integer', () => [], [r])
    expect(e.metadata.reasons).toEqual(['x.y'])
  })
})
