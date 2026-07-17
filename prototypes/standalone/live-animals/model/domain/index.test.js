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
  animalsCertifiedFor,
  passport,
  tattoo,
  earTag,
  horseName,
  identificationDetails,
  description
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
  arrivalDateAtPortDomain,
  transitedCountriesDomain,
  animalsCertifiedForDomain,
  passportDomain,
  tattooDomain,
  earTagDomain,
  horseNameDomain,
  identificationDetailsDomain,
  descriptionDomain,
  staticEnum,
  computedEnum,
  predicate,
  reasons
} from './index.js'

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

describe('computedEnum (MDM) — reasonForImport', () => {
  it('returns the MDM options regardless of state', () => {
    expect(reasonForImportDomain.type).toBe('enum')
    expect(reasonForImportDomain.options({})).toContain('internalMarket')
    expect(reasonForImportDomain.options({ anything: 'goes' })).toEqual(
      reasonForImportDomain.options({})
    )
  })

  it('names its shape as computedEnum in metadata', () => {
    expect(reasonForImportDomain.metadata.shape).toBe('computedEnum')
  })

  it('sources the 5 reason codes from the import-reason-purpose service (inc-007c)', () => {
    // inc-007c: options come from A's MDM service — A's stored vocabulary
    // is camelCase, not B's hardcoded kebab list.
    expect(reasonForImportDomain.options({})).toEqual([
      'internalMarket',
      'transhipmentOrOnwardTravel',
      'transit',
      'reEntry',
      'temporaryAdmissionHorses'
    ])
  })
})

describe('computedEnum (MDM) — purposeInInternalMarket', () => {
  it('returns the MDM sub-values when reason is internalMarket', () => {
    // inc-007c: values sourced from the import-reason-purpose service;
    // the reason gate value is A's camelCase 'internalMarket' code.
    const options = purposeInInternalMarketDomain.options({
      [reasonForImport.id]: 'internalMarket'
    })
    expect(options).toEqual([
      'transfer-of-ownership-sale-gift',
      'transfer-of-ownership-rescue',
      'breeding',
      'research',
      'racing-competition-show-or-training',
      'approved-premises-or-body',
      'companion-animal-not-for-resale-or-rehoming',
      'production',
      'slaughter',
      'fattening',
      'restocking'
    ])
  })

  it('returns [] when reason is anything else or unset', () => {
    expect(
      purposeInInternalMarketDomain.options({
        [reasonForImport.id]: 'transit'
      })
    ).toEqual([])
    expect(purposeInInternalMarketDomain.options({})).toEqual([])
  })

  it('declares readsFrom in metadata', () => {
    expect(purposeInInternalMarketDomain.metadata.readsFrom).toEqual([
      'reasonForImport'
    ])
  })

  it('carries all 11 purpose codes from the service', () => {
    const options = purposeInInternalMarketDomain.options({
      [reasonForImport.id]: 'internalMarket'
    })
    expect(options).toHaveLength(11)
    expect(options).not.toContain('other')
  })
})

describe('staticEnum — countryOfOrigin', () => {
  it('offers at least the 25 country options needed to exercise the > 12 cap on transitedCountries', () => {
    const options = countryOfOriginDomain.options({})
    expect(options.length).toBeGreaterThanOrEqual(13)
    expect(options).toContain('FR')
  })

  it('excludes GB per V4 spec (audit #5 — EU / EEA / EFTA only)', () => {
    // V4 spec Confluence page 6497338582: "Restricted to countries in
    // the named MDM list for EU, EEA and EFTA countries." GB is
    // neither. Address blocks may still pick GB (they use the wider
    // COUNTRY_OPTIONS list); countryOfOrigin does not.
    expect(countryOfOriginDomain.options({})).not.toContain('GB')
  })
})

describe('computedEnum (MDM) — commodityCode', () => {
  it('sources A commodity picker NAMES from the commodities service (inc-007c)', () => {
    // inc-007c: options are A's commodity NAMES, not CN codes. B's gates
    // still compare codes; the name↔code normalisation is the bridge /
    // oracle's job (PLAN §5.6, COMMODITY_CODES, A→B only).
    expect(commodityCodeDomain.options({})).toEqual([
      'Cow',
      'Horse',
      'Cat',
      'Dog',
      'Fish'
    ])
  })
})

describe('addressBlock — commercialTransporter (V4 standard address block + auth number)', () => {
  // Step 5e widened this from the 4-mandatory-string stub to the V4
  // standard address block (9 sub-fields, mixed mandatory/optional,
  // per-sub-field max-lengths, country MDM enum, telephone / email
  // types). commercialTransporter carries an extra
  // `transporterAuthorisationNumber` beyond the base 9.
  const fullValid = {
    name: 'ACME',
    transporterAuthorisationNumber: 'UK/AUTH/2026/001',
    addressLine1: 'Farm Lane',
    town: 'Exeter',
    postcode: 'EX1 1AA',
    country: 'GB',
    telephone: '+44 1234 567890',
    email: 'ops@acme.example'
  }

  it('exposes type/subFields/required/subFieldRules metadata for the widget layer', () => {
    expect(commercialTransporterDomain.type).toBe('address')
    expect(commercialTransporterDomain.subFields).toEqual([
      'name',
      'transporterAuthorisationNumber',
      'addressLine1',
      'addressLine2',
      'town',
      'county',
      'postcode',
      'country',
      'telephone',
      'email'
    ])
    expect(commercialTransporterDomain.required).toEqual([
      'name',
      'transporterAuthorisationNumber',
      'addressLine1',
      'town',
      'postcode',
      'country',
      'telephone',
      'email'
    ])
    expect(commercialTransporterDomain.subFieldRules.postcode).toEqual({
      type: 'string',
      maxLength: 12
    })
    expect(commercialTransporterDomain.subFieldRules.country.type).toBe('enum')
    expect(commercialTransporterDomain.subFieldRules.telephone).toEqual({
      type: 'telephone',
      maxLength: 20
    })
    expect(commercialTransporterDomain.subFieldRules.email).toEqual({
      type: 'email',
      maxLength: 254
    })
    expect(commercialTransporterDomain.metadata.shape).toBe('addressBlock')
  })

  it('passes an all-filled composite value with every V4 sub-field', () => {
    expect(
      commercialTransporterDomain.predicate(fullValid, buildCtx())
    ).toEqual([])
  })

  it('passes undefined / null — blank is handled upstream, not here', () => {
    expect(
      commercialTransporterDomain.predicate(undefined, buildCtx())
    ).toEqual([])
    expect(commercialTransporterDomain.predicate(null, buildCtx())).toEqual([])
  })

  it('does NOT emit required errors for blank required sub-fields (V4 spec interpretation A)', () => {
    // Regression: predicate used to emit one addressSubFieldRequired
    // per empty required sub-field. V4 spec Standard Address Block:
    // "The validation below applies once the address record is
    // provided" — interpretation A validates only user-supplied
    // sub-fields. Completeness is enforced at CYA via `isComplete`
    // + the promptCompleteAddress prompt. Parent-level mandate on
    // the flow presents entry blocks fully-blank submissions.
    const errs = commercialTransporterDomain.predicate(
      {
        ...fullValid,
        addressLine1: '',
        town: ''
      },
      buildCtx()
    )
    expect(errs).toEqual([])
    // But isComplete correctly reports the address as incomplete —
    // that's the completeness signal CYA uses.
    expect(
      commercialTransporterDomain.isComplete({
        ...fullValid,
        addressLine1: '',
        town: ''
      })
    ).toBe(false)
    expect(commercialTransporterDomain.isComplete(fullValid)).toBe(true)
  })

  it('isComplete: true iff every required sub-field is a non-blank string', () => {
    expect(commercialTransporterDomain.isComplete(fullValid)).toBe(true)
    // Blank optional (addressLine2 / county) doesn't affect
    // completeness.
    expect(
      commercialTransporterDomain.isComplete({
        ...fullValid,
        addressLine2: '',
        county: ''
      })
    ).toBe(true)
    // Blank required sub-field → not complete.
    expect(
      commercialTransporterDomain.isComplete({ ...fullValid, telephone: '' })
    ).toBe(false)
    // Undefined / null / non-object → not complete.
    expect(commercialTransporterDomain.isComplete(undefined)).toBe(false)
    expect(commercialTransporterDomain.isComplete(null)).toBe(false)
    expect(commercialTransporterDomain.isComplete('string')).toBe(false)
    expect(commercialTransporterDomain.isComplete([])).toBe(false)
  })

  it('does NOT emit an error for a blank OPTIONAL sub-field (addressLine2 / county)', () => {
    expect(
      commercialTransporterDomain.predicate(fullValid, buildCtx())
    ).toEqual([])
    // Adding blank optional fields explicitly should still pass.
    expect(
      commercialTransporterDomain.predicate(
        { ...fullValid, addressLine2: '', county: '' },
        buildCtx()
      )
    ).toEqual([])
  })

  it('rejects a sub-field that exceeds its V4 max-length', () => {
    // postcode max 12 per V4; 13 chars should fire.
    const errs = commercialTransporterDomain.predicate(
      { ...fullValid, postcode: 'X'.repeat(13) },
      buildCtx()
    )
    expect(errs).toHaveLength(1)
    expect(errs[0]).toMatchObject({
      code: reasons.addressSubFieldMaxLength.code,
      subField: 'postcode',
      max: 12,
      actual: 13
    })
  })

  it('rejects a malformed email sub-field (missing @)', () => {
    const errs = commercialTransporterDomain.predicate(
      { ...fullValid, email: 'no-at-sign' },
      buildCtx()
    )
    expect(errs).toHaveLength(1)
    expect(errs[0].code).toBe(reasons.addressSubFieldEmailFormat.code)
    expect(errs[0].subField).toBe('email')
  })

  it('rejects a country sub-field not in the MDM enum', () => {
    const errs = commercialTransporterDomain.predicate(
      { ...fullValid, country: 'ZZ' },
      buildCtx()
    )
    expect(errs).toHaveLength(1)
    expect(errs[0].code).toBe(reasons.addressSubFieldEnumInvalid.code)
    expect(errs[0].subField).toBe('country')
    expect(errs[0].invalid).toBe('ZZ')
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

describe('staticEnum — commodityType (audit #12 — deliberately obvious placeholders)', () => {
  it('exposes the spec-example code plus two obvious placeholder codes', () => {
    // Audit #12 (down-graded MAJOR → INFO, spec clarifications
    // pending): the V4 spec's only concrete Type value is "game";
    // the full MDM ontology isn't documented. Rather than ship
    // plausible-but-invented codes that could slip past a reviewer,
    // we ship "game" plus two codes that name themselves placeholders.
    const options = commodityTypeDomain.options({})
    expect(options).toEqual(['game', 'placeholder-1', 'placeholder-2'])
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

describe('predicate — per-unit identifiers (V4: string max 58, step 5a)', () => {
  // Iteration 10 shipped these with conservative defaults (40 for
  // structured ids, 100 for free-text). V4 spec (Confluence page
  // 6497338582) pins every one to `string - max 58`. Step 5a
  // tightened the domain rules to match. These tests pin the current
  // limit so a future edit to the wrong number fails loudly.
  const identifierDomains = [
    ['passport', passportDomain, passport],
    ['tattoo', tattooDomain, tattoo],
    ['earTag', earTagDomain, earTag],
    ['horseName', horseNameDomain, horseName],
    [
      'identificationDetails',
      identificationDetailsDomain,
      identificationDetails
    ],
    ['description', descriptionDomain, description]
  ]

  for (const [name, domainEntry, obligation] of identifierDomains) {
    describe(`${name} — max 58`, () => {
      it('passes exactly 58 characters', () => {
        expect(domainEntry.predicate('x'.repeat(58), buildCtx())).toEqual([])
      })

      it('rejects 59 characters (regression against the old 40 / 100 caps)', () => {
        const errs = domainEntry.predicate('x'.repeat(59), buildCtx())
        expect(errs).toHaveLength(1)
        expect(errs[0].code).toBe(reasons.stringMaxLength.code)
        expect(errs[0].max).toBe(58)
        expect(errs[0].actual).toBe(59)
        expect(errs[0].obligation).toBe(obligation.name)
      })
    })
  }
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

describe('predicate — numberOfAnimals (V4: integer, min 1, no per-species cap)', () => {
  // V4 spec: "numeric - whole number, max 9,223,372,036,854,775,807"
  // (Long.MAX). No per-species cap in the spec. The prior spike carried
  // a fabricated SPECIES_ANIMAL_CAP map that rejected spec-valid values
  // (audit BLOCKER #4); it has been removed.
  const line1 = { path: 'line1' }

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

  it('passes any positive integer regardless of species selection', () => {
    // Regression: prior spike rejected 5000 on a horse line under the
    // fabricated horse=100 cap. Under V4 the value is well within spec.
    const ctxWithSpecies = (selected) =>
      buildCtx({
        fulfilments: { [species.id]: { line1: selected } },
        path: 'line1'
      })
    expect(numberOfAnimalsDomain.predicate(5000, buildCtx(line1))).toEqual([])
    expect(
      numberOfAnimalsDomain.predicate(5000, ctxWithSpecies(['horse']))
    ).toEqual([])
    expect(
      numberOfAnimalsDomain.predicate(1_000_000, ctxWithSpecies(['cattle']))
    ).toEqual([])
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

describe('computedEnum (MDM) — animalsCertifiedFor', () => {
  it('sources the certified-for purpose codes from the certification-purposes service (inc-007c)', () => {
    // inc-007c: values now come from A's MDM service. The codes are A's
    // vocabulary (e.g. 'travelling-circus-animal-act', not B's
    // 'travelling-circus-or-animal-act').
    expect(animalsCertifiedForDomain.options({})).toEqual([
      'further-keeping',
      'slaughter',
      'confined-establishment',
      'germinal-products',
      'registered-equine-animal',
      'travelling-circus-animal-act',
      'exhibition',
      'event-or-activity-near-borders',
      'release-into-the-wild',
      'dispatch-centre',
      'relaying-area-purification-centre',
      'ornamental-aquaculture-establishment',
      'technical-use',
      'quarantine-or-similar-establishment',
      'live-aquatic-animals-for-human-consumption',
      'other'
    ])
    // No leaked species stubs.
    for (const bad of ['bovine', 'ovine', 'porcine', 'equine']) {
      expect(animalsCertifiedForDomain.options({})).not.toContain(bad)
    }
  })

  it('names its shape as computedEnum in metadata', () => {
    expect(animalsCertifiedForDomain.metadata.shape).toBe('computedEnum')
  })
})

describe('factories', () => {
  it('staticEnum ignores state and exposes the fixed options', () => {
    const e = staticEnum(['x', 'y'])
    expect(e.options()).toEqual(['x', 'y'])
    expect(e.metadata.shape).toBe('staticEnum')
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
