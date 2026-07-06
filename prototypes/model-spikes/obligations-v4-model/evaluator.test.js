import { describe, it, expect, beforeEach } from 'vitest'
import { createObligationEvaluator } from './evaluator.js'
import {
  countryOfOrigin,
  regionCodeRequirement,
  regionCode,
  reasonForImport,
  purposeInInternalMarket,
  containsUnweanedAnimals,
  placeOfOrigin,
  consignor,
  consignee,
  importer,
  placeOfDestination,
  transporterType,
  commercialTransporter,
  privateTransporter,
  meansOfTransport,
  transportIdentification,
  transportDocumentReference,
  transitedCountries,
  arrivalDateAtPort,
  portOfEntry,
  contactAddress,
  internalReferenceNumber,
  animalsCertifiedFor,
  commodityLine,
  commodityCode,
  commodityType,
  species,
  numberOfAnimals,
  numberOfPackages,
  cph
} from './obligations.js'

let evaluator
beforeEach(() => {
  evaluator = createObligationEvaluator()
})

const mandatory = { inScope: true, status: 'mandatory' }
const optional = { inScope: true, status: 'optional' }
const outOfScope = { inScope: false }

const regionCodeRequiredReason = {
  code: 'obligation.regionCode.mandatory.becauseRegionCodeRequired',
  explanation: 'regionCode is mandatory when regionCodeRequirement is yes'
}

const purposeInInternalMarketReason = {
  code: 'obligation.purposeInInternalMarket.applicable.becauseInternalMarket',
  explanation:
    'purposeInInternalMarket applies when reasonForImport is internal-market'
}

const commercialTransporterReason = {
  code: 'obligation.commercialTransporter.applicable.becauseCommercial',
  explanation:
    'commercialTransporter applies when transporterType is commercial'
}

const privateTransporterReason = {
  code: 'obligation.privateTransporter.applicable.becausePrivate',
  explanation: 'privateTransporter applies when transporterType is private'
}

const transitedCountriesReason = {
  code: 'obligation.transitedCountries.applicable.becauseLandTransport',
  explanation:
    'transitedCountries applies when meansOfTransport is railway or road-vehicle'
}

const numberOfPackagesReason = {
  code: 'obligation.numberOfPackages.applicable.becausePackageCountCommodity',
  explanation:
    'numberOfPackages applies on lines whose commodityCode is in the package-count list'
}

const cphReason = {
  code: 'obligation.cph.applicable.becauseCphCommodity',
  explanation:
    'CPH applies when any commodity line has a CPH-required commodityCode'
}

// Line-instance-id mnemonics. Real orchestrator-generated ids are
// opaque ULIDs; the tests use readable constants so intent is
// scannable (option 3 of the readability-vs-machinery discussion —
// see GAPS.md §1).
const LINE_UNKNOWN = 'line1' // commodity code not in any allowlist
const LINE_BEES = 'line2' //    01064100 — packages required, CPH not required
const LINE_OWLS = 'line3' //    01063100 — packages required, CPH not required
const LINE_CATTLE = 'line4' //  0102     — packages required AND CPH required
const LINE_SHEEP = 'line5' //   010410   — CPH required, packages not

// A representative composite address value — the obligation model treats
// the address as an opaque single value; field-level validation is out
// of scope. Field names come from the V4 Standard Address Block.
const alpineExporterAddress = {
  name: 'Alpine Livestock Exports GmbH',
  addressLine1: 'Gewerbestrasse 18',
  addressLine2: 'Industriegebiet Süd',
  town: 'Munich',
  postCode: '80331',
  country: 'DE',
  telephone: '+49 89 4521 7780',
  email: 'exports@alpinelivestock.de'
}

// ---------------------------------------------------------------------------
// Smoke — evaluator wires up against the fresh manifest
// ---------------------------------------------------------------------------

describe('V4 smoke — evaluator wires up against fresh manifest', () => {
  it('returns { fulfilments, obligations } shape for an empty input', () => {
    const result = evaluator.evaluate({})
    expect(result.fulfilments).toEqual({})
    expect(result.obligations[countryOfOrigin.id]).toEqual(mandatory)
    expect(result.obligations[regionCodeRequirement.id]).toEqual(mandatory)
    expect(result.obligations[regionCode.id]).toEqual(optional)
  })

  it('unrecognised obligation ids are dropped (tolerate-and-amend)', () => {
    const result = evaluator.evaluate({ 'not-an-obligation-id': 'anything' })
    expect(result.fulfilments).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// Always-mandatory notification-level singles — batched
// ---------------------------------------------------------------------------

describe('V4 — always-mandatory notification-level singles', () => {
  it.each([
    ['countryOfOrigin', countryOfOrigin],
    ['regionCodeRequirement', regionCodeRequirement],
    ['reasonForImport', reasonForImport],
    ['containsUnweanedAnimals', containsUnweanedAnimals],
    ['transporterType', transporterType],
    ['meansOfTransport', meansOfTransport],
    ['transportIdentification', transportIdentification],
    ['transportDocumentReference', transportDocumentReference],
    ['arrivalDateAtPort', arrivalDateAtPort],
    ['portOfEntry', portOfEntry],
    ['animalsCertifiedFor', animalsCertifiedFor]
  ])('%s is mandatory in-scope on empty input', (_name, obligation) => {
    const result = evaluator.evaluate({})
    expect(result.obligations[obligation.id]).toEqual(mandatory)
  })
})

// ---------------------------------------------------------------------------
// countryOfOrigin (representative single) — round-trip
// ---------------------------------------------------------------------------

describe('V4 — countryOfOrigin round-trip', () => {
  it('stored value passes through and remains mandatory in-scope', () => {
    const result = evaluator.evaluate({ [countryOfOrigin.id]: 'France' })
    expect(result.fulfilments[countryOfOrigin.id]).toBe('France')
    expect(result.obligations[countryOfOrigin.id]).toEqual(mandatory)
  })
})

// ---------------------------------------------------------------------------
// regionCode conditional gate (retain-value pattern)
// ---------------------------------------------------------------------------

describe('V4 — regionCode conditional gate', () => {
  it('is optional in-scope when regionCodeRequirement is absent', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[regionCode.id]).toEqual(optional)
  })

  it('is optional in-scope when regionCodeRequirement is no', () => {
    const result = evaluator.evaluate({
      [regionCodeRequirement.id]: 'no'
    })
    expect(result.obligations[regionCode.id]).toEqual(optional)
  })

  it('is mandatory in-scope when regionCodeRequirement is yes', () => {
    const result = evaluator.evaluate({
      [regionCodeRequirement.id]: 'yes'
    })
    expect(result.obligations[regionCode.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [regionCodeRequiredReason]
    })
  })

  // Matches the V4 spec: regionCode is always in scope; flipping the
  // requirement off downgrades status but does not purge the stored value.
  it('retains a stored regionCode value when the requirement flips from yes to no', () => {
    const stored = {
      [regionCodeRequirement.id]: 'no',
      [regionCode.id]: 'FR-75'
    }
    const result = evaluator.evaluate(stored)
    expect(result.fulfilments[regionCode.id]).toBe('FR-75')
    expect(result.obligations[regionCode.id]).toEqual(optional)
  })
})

// ---------------------------------------------------------------------------
// internalReferenceNumber (always-optional)
// ---------------------------------------------------------------------------

describe('V4 — internalReferenceNumber (always optional)', () => {
  it('is optional in-scope on empty input', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[internalReferenceNumber.id]).toEqual(optional)
  })

  it('round-trips a stored value and remains optional in-scope', () => {
    const result = evaluator.evaluate({
      [internalReferenceNumber.id]: 'Imports456_GB'
    })
    expect(result.fulfilments[internalReferenceNumber.id]).toBe('Imports456_GB')
    expect(result.obligations[internalReferenceNumber.id]).toEqual(optional)
  })
})

// ---------------------------------------------------------------------------
// purposeInInternalMarket conditional gate (purge-on-flip pattern)
// ---------------------------------------------------------------------------

describe('V4 — purposeInInternalMarket conditional gate', () => {
  it('is out of scope when reasonForImport is absent', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[purposeInInternalMarket.id]).toEqual(outOfScope)
  })

  it('is out of scope when reasonForImport is not internal-market', () => {
    const result = evaluator.evaluate({
      [reasonForImport.id]: 'transit'
    })
    expect(result.obligations[purposeInInternalMarket.id]).toEqual(outOfScope)
  })

  it('is mandatory in-scope when reasonForImport is internal-market', () => {
    const result = evaluator.evaluate({
      [reasonForImport.id]: 'internal-market'
    })
    expect(result.obligations[purposeInInternalMarket.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [purposeInInternalMarketReason]
    })
  })

  it('purges stored purpose when reasonForImport flips away from internal-market', () => {
    const result = evaluator.evaluate({
      [reasonForImport.id]: 'transit',
      [purposeInInternalMarket.id]: 'slaughter'
    })
    expect(result.fulfilments[purposeInInternalMarket.id]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// transporterType → commercial vs private mutual exclusion
// ---------------------------------------------------------------------------

describe('V4 — transporterType → commercial vs private mutual exclusion', () => {
  it('both address blocks are out of scope when transporterType is absent', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[commercialTransporter.id]).toEqual(outOfScope)
    expect(result.obligations[privateTransporter.id]).toEqual(outOfScope)
  })

  it('commercial in-scope, private out-of-scope when type is commercial', () => {
    const result = evaluator.evaluate({
      [transporterType.id]: 'commercial'
    })
    expect(result.obligations[commercialTransporter.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [commercialTransporterReason]
    })
    expect(result.obligations[privateTransporter.id]).toEqual(outOfScope)
  })

  it('private in-scope, commercial out-of-scope when type is private', () => {
    const result = evaluator.evaluate({
      [transporterType.id]: 'private'
    })
    expect(result.obligations[commercialTransporter.id]).toEqual(outOfScope)
    expect(result.obligations[privateTransporter.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [privateTransporterReason]
    })
  })

  it('purges a stored commercialTransporter address when type flips to private', () => {
    const result = evaluator.evaluate({
      [transporterType.id]: 'private',
      [commercialTransporter.id]: alpineExporterAddress
    })
    expect(result.fulfilments[commercialTransporter.id]).toBeUndefined()
  })

  it('purges a stored privateTransporter address when type flips to commercial', () => {
    const result = evaluator.evaluate({
      [transporterType.id]: 'commercial',
      [privateTransporter.id]: alpineExporterAddress
    })
    expect(result.fulfilments[privateTransporter.id]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// meansOfTransport → transitedCountries multi-select gate
// ---------------------------------------------------------------------------

describe('V4 — transitedCountries conditional gate', () => {
  it('is out of scope when meansOfTransport is absent', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[transitedCountries.id]).toEqual(outOfScope)
  })

  it('is out of scope when meansOfTransport is airplane', () => {
    const result = evaluator.evaluate({
      [meansOfTransport.id]: 'airplane'
    })
    expect(result.obligations[transitedCountries.id]).toEqual(outOfScope)
  })

  it('is optional in-scope when meansOfTransport is road-vehicle', () => {
    const result = evaluator.evaluate({
      [meansOfTransport.id]: 'road-vehicle'
    })
    expect(result.obligations[transitedCountries.id]).toEqual({
      inScope: true,
      status: 'optional',
      reasons: [transitedCountriesReason]
    })
  })

  it('is optional in-scope when meansOfTransport is railway', () => {
    const result = evaluator.evaluate({
      [meansOfTransport.id]: 'railway'
    })
    expect(result.obligations[transitedCountries.id]).toEqual({
      inScope: true,
      status: 'optional',
      reasons: [transitedCountriesReason]
    })
  })

  it('purges stored transitedCountries when meansOfTransport flips to airplane', () => {
    const result = evaluator.evaluate({
      [meansOfTransport.id]: 'airplane',
      [transitedCountries.id]: ['France', 'Belgium']
    })
    expect(result.fulfilments[transitedCountries.id]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Standard address blocks — composite value round-trip
// ---------------------------------------------------------------------------

describe('V4 — standard address blocks (composite value round-trip)', () => {
  it.each([
    ['placeOfOrigin', placeOfOrigin],
    ['consignor', consignor],
    ['consignee', consignee],
    ['importer', importer],
    ['placeOfDestination', placeOfDestination],
    ['contactAddress', contactAddress]
  ])('%s stores and returns a composite address value', (_name, obligation) => {
    const result = evaluator.evaluate({
      [obligation.id]: alpineExporterAddress
    })
    expect(result.fulfilments[obligation.id]).toEqual(alpineExporterAddress)
    expect(result.obligations[obligation.id]).toEqual(mandatory)
  })
})

// ---------------------------------------------------------------------------
// Commodity line — user-driven indexed group semantics
// ---------------------------------------------------------------------------

describe('V4 — commodity line group semantics', () => {
  it('has no records when no commodity lines exist', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[commodityLine.id]).toEqual({
      inScope: true,
      records: []
    })
  })

  it('infers a group fulfilmentId per line from commodityCode composite-key prefixes', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_BEES]: '01064100',
        [LINE_OWLS]: '01063100'
      }
    })
    const ids = new Set(
      result.obligations[commodityLine.id].records.map((r) => r.fulfilmentId)
    )
    expect(ids).toEqual(new Set([LINE_BEES, LINE_OWLS]))
  })

  it('unions fulfilmentIds across any descendant field record', () => {
    // Only numberOfAnimals is answered on line3 — the line's presence
    // is still inferred (no dedicated commodityCode entry required).
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_BEES]: '01064100' },
      [numberOfAnimals.id]: { [LINE_OWLS]: 42 }
    })
    const ids = new Set(
      result.obligations[commodityLine.id].records.map((r) => r.fulfilmentId)
    )
    expect(ids).toEqual(new Set([LINE_BEES, LINE_OWLS]))
  })
})

// ---------------------------------------------------------------------------
// Commodity line field records — per-line round-trip
// ---------------------------------------------------------------------------

describe('V4 — commodity line field records (round-trip)', () => {
  it('commodityCode stores one value per line', () => {
    const stored = {
      [LINE_UNKNOWN]: '00000001',
      [LINE_BEES]: '01064100',
      [LINE_OWLS]: '01063100'
    }
    const result = evaluator.evaluate({ [commodityCode.id]: stored })
    expect(result.fulfilments[commodityCode.id]).toEqual(stored)
  })

  it('commodityType stores one value per line', () => {
    const result = evaluator.evaluate({
      [commodityType.id]: { [LINE_BEES]: 'Adult', [LINE_OWLS]: 'Adult' }
    })
    expect(result.fulfilments[commodityType.id]).toEqual({
      [LINE_BEES]: 'Adult',
      [LINE_OWLS]: 'Adult'
    })
  })

  it('numberOfAnimals stores one whole-number value per line', () => {
    const result = evaluator.evaluate({
      [numberOfAnimals.id]: { [LINE_BEES]: 250, [LINE_OWLS]: 12 }
    })
    expect(result.fulfilments[numberOfAnimals.id]).toEqual({
      [LINE_BEES]: 250,
      [LINE_OWLS]: 12
    })
  })

  it('species stores an array of species strings per line', () => {
    const result = evaluator.evaluate({
      [species.id]: {
        [LINE_BEES]: ['Apis mellifera'],
        [LINE_CATTLE]: ['Bos taurus', 'Bison bison']
      }
    })
    expect(result.fulfilments[species.id]).toEqual({
      [LINE_BEES]: ['Apis mellifera'],
      [LINE_CATTLE]: ['Bos taurus', 'Bison bison']
    })
  })
})

// ---------------------------------------------------------------------------
// numberOfPackages — derived-leaf reuse (commodity-code-gated per line)
// See GAPS.md §1.
// ---------------------------------------------------------------------------

describe('V4 — numberOfPackages (derived-leaf, commodity-code-gated)', () => {
  it('is out of scope when no commodity lines exist', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[numberOfPackages.id]).toEqual(outOfScope)
  })

  it('is out of scope when no line has a package-count commodity code', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_UNKNOWN]: '00000001' }
    })
    expect(result.obligations[numberOfPackages.id]).toEqual(outOfScope)
  })

  it('is in scope with reason on a matching line', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_BEES]: '01064100' }
    })
    expect(result.obligations[numberOfPackages.id]).toEqual({
      inScope: true,
      reasons: [numberOfPackagesReason],
      records: [{ fulfilmentId: LINE_BEES, status: 'optional' }]
    })
  })

  it('records list contains only matching line ids (mixed manifest)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_UNKNOWN]: '00000001',
        [LINE_BEES]: '01064100',
        [LINE_OWLS]: '01063100'
      }
    })
    const ids = result.obligations[numberOfPackages.id].records.map(
      (r) => r.fulfilmentId
    )
    expect(new Set(ids)).toEqual(new Set([LINE_BEES, LINE_OWLS]))
  })

  it('keeps a stored value on a matching line (round-trip)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_BEES]: '01064100' },
      [numberOfPackages.id]: { [LINE_BEES]: 3 }
    })
    expect(result.fulfilments[numberOfPackages.id]).toEqual({
      [LINE_BEES]: 3
    })
  })

  it('purges a stored value on a non-matching line', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_UNKNOWN]: '00000001' },
      [numberOfPackages.id]: { [LINE_UNKNOWN]: 7 }
    })
    expect(result.fulfilments[numberOfPackages.id]).toBeUndefined()
  })

  it('keeps matching-line values, purges non-matching-line values (mixed)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_UNKNOWN]: '00000001',
        [LINE_BEES]: '01064100',
        [LINE_OWLS]: '01063100'
      },
      [numberOfPackages.id]: {
        [LINE_UNKNOWN]: 7, // should be purged
        [LINE_BEES]: 3 // should survive
        // LINE_OWLS unanswered
      }
    })
    expect(result.fulfilments[numberOfPackages.id]).toEqual({
      [LINE_BEES]: 3
    })
  })

  // Identity comes from line-instance-id, not code value — see GAPS.md §1
  // for why the code-value-keyed shape would collapse here.
  it('supports two lines sharing the same matching code', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_BEES]: '01064100',
        [LINE_OWLS]: '01064100' // both lines: bees
      },
      [numberOfPackages.id]: {
        [LINE_BEES]: 3,
        [LINE_OWLS]: 5
      }
    })
    expect(result.fulfilments[numberOfPackages.id]).toEqual({
      [LINE_BEES]: 3,
      [LINE_OWLS]: 5
    })
    const ids = result.obligations[numberOfPackages.id].records.map(
      (r) => r.fulfilmentId
    )
    expect(new Set(ids)).toEqual(new Set([LINE_BEES, LINE_OWLS]))
  })
})

// ---------------------------------------------------------------------------
// CPH — notification-level single reading nested storage
// ---------------------------------------------------------------------------

describe('V4 — cph (notification-level, reads commodityCode storage)', () => {
  it('is out of scope when no commodity lines exist', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[cph.id]).toEqual(outOfScope)
  })

  it('is out of scope when no line has a CPH-required commodity code', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_BEES]: '01064100',
        [LINE_OWLS]: '01063100'
      }
    })
    expect(result.obligations[cph.id]).toEqual(outOfScope)
  })

  it('is mandatory in-scope when at least one line has a CPH-required code', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_BEES]: '01064100', // not CPH-required
        [LINE_SHEEP]: '010410' //   CPH-required
      }
    })
    expect(result.obligations[cph.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [cphReason]
    })
  })

  it('keeps a stored cph value when a required code is present', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: '0102' },
      [cph.id]: '123456789'
    })
    expect(result.fulfilments[cph.id]).toBe('123456789')
  })

  it('purges a stored cph value when no line has a required code', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_BEES]: '01064100' },
      [cph.id]: '123456789'
    })
    expect(result.fulfilments[cph.id]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Interlock — one cattle line triggers both packages and CPH gates
// ---------------------------------------------------------------------------

describe('V4 — cattle line triggers both packages and CPH gates', () => {
  it('activates numberOfPackages (per-line) and cph (notification-level) simultaneously', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: '0102' }
    })
    expect(
      result.obligations[numberOfPackages.id].records.map((r) => r.fulfilmentId)
    ).toEqual([LINE_CATTLE])
    expect(result.obligations[cph.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [cphReason]
    })
  })
})
