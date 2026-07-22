import { describe, it, expect, beforeEach } from 'vitest'
import { createObligationEvaluator } from './evaluator.js'
import { groupInvariantErrors } from '../engine/index.js'
import {
  poApprovedReferenceNumber,
  responsiblePersonForLoad,
  countryOfOrigin,
  regionCodeRequirement,
  regionCode,
  reasonForImport,
  purposeInInternalMarket,
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
  cph,
  unitRecord,
  passport,
  tattoo,
  earTag,
  horseName,
  identificationDetails,
  description,
  permanentAddress,
  documents,
  accompanyingDocumentType,
  accompanyingDocumentAttachmentType,
  accompanyingDocumentReference,
  accompanyingDocumentDateOfIssue
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
    'transitedCountries applies when meansOfTransport is RAILWAY or ROAD_VEHICLE'
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
const LINE_CATTLE = 'line4' //  0102     — packages required AND CPH required, passport + tattoo + earTag
const LINE_SHEEP = 'line5' //   010410   — CPH required, packages not, earTag only
const LINE_HORSE = 'lineH' //   0101     — passport + horseName
const LINE_CATSDOGS = 'lineD' // 01061900 — passport + tattoo + permanentAddress

// Unit-instance-id mnemonics for depth-2 composite keys (`lineId/unitId`).
const UNIT_1 = 'unit1'
const UNIT_2 = 'unit2'

// Reason constants for the migrated applyTo + helpers obligations.
const passportReason = {
  code: 'obligation.passport.applicable.becausePassportCommodity',
  explanation:
    'passport applies on units of lines whose commodityCode is in the passport list'
}
const tattooReason = {
  code: 'obligation.tattoo.applicable.becauseTattooCommodity',
  explanation:
    'tattoo applies on units of lines whose commodityCode is in the tattoo list'
}
const earTagReason = {
  code: 'obligation.earTag.applicable.becauseEarTagCommodity',
  explanation:
    'earTag applies on units of lines whose commodityCode is in the ear-tag list'
}
const horseNameReason = {
  code: 'obligation.horseName.applicable.becauseHorseCommodity',
  explanation: 'horseName applies on units of horse-commodity lines'
}
const identificationDetailsReason = {
  code: 'obligation.identificationDetails.applicable.becauseNoSpecificIdentifier',
  explanation:
    'identificationDetails applies on units of lines whose commodityCode has no specific identifier type'
}
const permanentAddressReason = {
  code: 'obligation.permanentAddress.applicable.becausePermanentAddressCommodity',
  explanation:
    'permanentAddress applies on units of lines whose commodityCode requires per-animal permanent address'
}

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
    // Retain-value pattern: regionCode is always in scope — optional
    // until the requirement is 'yes'.
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
  // Note: containsUnweanedAnimals is NOT in this list any more —
  // audit #11 gated it on the active commodity codes (equines /
  // cattle / pigs / sheep / goats), so it's out-of-scope until a
  // matching commodity line is added. Covered separately below.
  it.each([
    ['countryOfOrigin', countryOfOrigin],
    ['regionCodeRequirement', regionCodeRequirement],
    ['reasonForImport', reasonForImport],
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

describe('V4 — regionCode conditional gate (retain-value)', () => {
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

  // Retain-value: the requirement flipping off demotes regionCode to
  // optional but keeps it in scope — the stored value survives.
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

  it('is out of scope when meansOfTransport is AIRPLANE', () => {
    const result = evaluator.evaluate({
      [meansOfTransport.id]: 'AIRPLANE'
    })
    expect(result.obligations[transitedCountries.id]).toEqual(outOfScope)
  })

  it('is optional in-scope when meansOfTransport is ROAD_VEHICLE', () => {
    const result = evaluator.evaluate({
      [meansOfTransport.id]: 'ROAD_VEHICLE'
    })
    expect(result.obligations[transitedCountries.id]).toEqual({
      inScope: true,
      status: 'optional',
      reasons: [transitedCountriesReason]
    })
  })

  it('is optional in-scope when meansOfTransport is RAILWAY', () => {
    const result = evaluator.evaluate({
      [meansOfTransport.id]: 'RAILWAY'
    })
    expect(result.obligations[transitedCountries.id]).toEqual({
      inScope: true,
      status: 'optional',
      reasons: [transitedCountriesReason]
    })
  })

  it('purges stored transitedCountries when meansOfTransport flips to AIRPLANE', () => {
    const result = evaluator.evaluate({
      [meansOfTransport.id]: 'AIRPLANE',
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

// ---------------------------------------------------------------------------
// Unit record — nested user-driven indexed group inside commodityLine
// (depth-2). Instance-ids inferred from descendant field-record composite-
// key prefixes.
// ---------------------------------------------------------------------------

describe('V4 — unit record group semantics', () => {
  it('has no records when no unit-level obligations have storage', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: '0102' }
    })
    expect(result.obligations[unitRecord.id]).toEqual({
      inScope: true,
      records: []
    })
  })

  it('infers unit-instance paths from a per-unit identifier storage', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: '0102' },
      [passport.id]: {
        [`${LINE_CATTLE}/${UNIT_1}`]: 'UK123',
        [`${LINE_CATTLE}/${UNIT_2}`]: 'UK456'
      }
    })
    const ids = new Set(
      result.obligations[unitRecord.id].records.map((r) => r.fulfilmentId)
    )
    expect(ids).toEqual(
      new Set([`${LINE_CATTLE}/${UNIT_1}`, `${LINE_CATTLE}/${UNIT_2}`])
    )
  })

  it('unions unit-instance paths across multiple identifier storages', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: '0102' },
      [passport.id]: { [`${LINE_CATTLE}/${UNIT_1}`]: 'UK123' },
      [earTag.id]: { [`${LINE_CATTLE}/${UNIT_2}`]: 'UK-EAR-999' }
    })
    const ids = new Set(
      result.obligations[unitRecord.id].records.map((r) => r.fulfilmentId)
    )
    expect(ids).toEqual(
      new Set([`${LINE_CATTLE}/${UNIT_1}`, `${LINE_CATTLE}/${UNIT_2}`])
    )
  })
})

// ---------------------------------------------------------------------------
// passport — commodity-gated per-unit identifier (gatedBy, depth-2)
// ---------------------------------------------------------------------------

describe('V4 — passport (gatedBy allowListed(commodityCode, PASSPORT_COMMODITIES))', () => {
  it('is out of scope when no commodity lines exist', () => {
    expect(evaluator.evaluate({}).obligations[passport.id]).toEqual({
      inScope: false
    })
  })

  it('is out of scope for lines with non-passport commodity codes', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_BEES]: '01064100' }
    })
    expect(result.obligations[passport.id]).toEqual({ inScope: false })
  })

  it('is in scope with one record per unit under a passport-list line', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: '0102' },
      [passport.id]: {
        [`${LINE_CATTLE}/${UNIT_1}`]: 'UK123',
        [`${LINE_CATTLE}/${UNIT_2}`]: 'UK456'
      }
    })
    expect(result.obligations[passport.id].inScope).toBe(true)
    expect(result.obligations[passport.id].reasons).toEqual([passportReason])
    const ids = new Set(
      result.obligations[passport.id].records.map((r) => r.fulfilmentId)
    )
    expect(ids).toEqual(
      new Set([`${LINE_CATTLE}/${UNIT_1}`, `${LINE_CATTLE}/${UNIT_2}`])
    )
  })

  it('keeps a stored passport value on a matching-line unit (round-trip)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: '0102' },
      [passport.id]: { [`${LINE_CATTLE}/${UNIT_1}`]: 'UK123' }
    })
    expect(result.fulfilments[passport.id]).toEqual({
      [`${LINE_CATTLE}/${UNIT_1}`]: 'UK123'
    })
  })

  it('purges a stored passport value on a non-matching-line unit', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_BEES]: '01064100' },
      [passport.id]: { [`${LINE_BEES}/${UNIT_1}`]: 'STRAY' }
    })
    expect(result.fulfilments[passport.id]).toBeUndefined()
  })

  it('keeps matching-line values, purges non-matching (mixed lines)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_BEES]: '01064100',
        [LINE_CATTLE]: '0102'
      },
      [passport.id]: {
        [`${LINE_BEES}/${UNIT_1}`]: 'STRAY',
        [`${LINE_CATTLE}/${UNIT_1}`]: 'UK123'
      }
    })
    expect(result.fulfilments[passport.id]).toEqual({
      [`${LINE_CATTLE}/${UNIT_1}`]: 'UK123'
    })
  })
})

// ---------------------------------------------------------------------------
// tattoo / earTag / horseName — same gatedBy shape, different whitelists
// ---------------------------------------------------------------------------

describe('V4 — tattoo (gatedBy allowListed(commodityCode, TATTOO_COMMODITIES))', () => {
  it('is in scope for cattle line (0102 in TATTOO_COMMODITIES)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: '0102' },
      [tattoo.id]: { [`${LINE_CATTLE}/${UNIT_1}`]: 'CT-99' }
    })
    expect(result.obligations[tattoo.id].inScope).toBe(true)
    expect(result.obligations[tattoo.id].reasons).toEqual([tattooReason])
  })

  it('is out of scope for horse (0101 not in TATTOO_COMMODITIES)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_HORSE]: '0101' }
    })
    expect(result.obligations[tattoo.id]).toEqual({ inScope: false })
  })
})

describe('V4 — earTag (gatedBy allowListed(commodityCode, EAR_TAG_COMMODITIES))', () => {
  it('is in scope for cattle (0102) and sheep (010410)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_CATTLE]: '0102',
        [LINE_SHEEP]: '010410'
      },
      [earTag.id]: {
        [`${LINE_CATTLE}/${UNIT_1}`]: 'UK-CAT-1',
        [`${LINE_SHEEP}/${UNIT_1}`]: 'UK-SHEEP-1'
      }
    })
    expect(result.obligations[earTag.id].inScope).toBe(true)
    expect(result.obligations[earTag.id].reasons).toEqual([earTagReason])
    const ids = new Set(
      result.obligations[earTag.id].records.map((r) => r.fulfilmentId)
    )
    expect(ids).toEqual(
      new Set([`${LINE_CATTLE}/${UNIT_1}`, `${LINE_SHEEP}/${UNIT_1}`])
    )
  })

  it('is out of scope for cats/dogs (01061900 not in EAR_TAG_COMMODITIES)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATSDOGS]: '01061900' }
    })
    expect(result.obligations[earTag.id]).toEqual({ inScope: false })
  })
})

describe('V4 — horseName (gatedBy allowListed(commodityCode, HORSE_NAME_COMMODITIES))', () => {
  it('is in scope only for horse commodity', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_HORSE]: '0101' },
      [horseName.id]: { [`${LINE_HORSE}/${UNIT_1}`]: 'Silver' }
    })
    expect(result.obligations[horseName.id].inScope).toBe(true)
    expect(result.obligations[horseName.id].reasons).toEqual([horseNameReason])
  })

  it('is out of scope for cattle', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: '0102' }
    })
    expect(result.obligations[horseName.id]).toEqual({ inScope: false })
  })
})

// ---------------------------------------------------------------------------
// identificationDetails / description — inverse gate (in scope only where
// no specific identifier applies)
// ---------------------------------------------------------------------------

describe('V4 — identificationDetails (inverse gate — no specific identifier applies)', () => {
  it('is in scope for bees (01064100 — no specific identifier)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_BEES]: '01064100' },
      [identificationDetails.id]: {
        [`${LINE_BEES}/${UNIT_1}`]: 'Hive HM-2026-004'
      }
    })
    expect(result.obligations[identificationDetails.id].inScope).toBe(true)
    expect(result.obligations[identificationDetails.id].reasons).toEqual([
      identificationDetailsReason
    ])
  })

  it('is out of scope for cattle (passport / tattoo / earTag apply)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: '0102' }
    })
    expect(result.obligations[identificationDetails.id]).toEqual({
      inScope: false
    })
  })

  it('is out of scope for horse (passport / horseName apply)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_HORSE]: '0101' }
    })
    expect(result.obligations[identificationDetails.id]).toEqual({
      inScope: false
    })
  })

  it('is out of scope for sheep (earTag applies)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_SHEEP]: '010410' }
    })
    expect(result.obligations[identificationDetails.id]).toEqual({
      inScope: false
    })
  })

  it('purges a stored idDetails value on a specific-identifier line', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: '0102' },
      [identificationDetails.id]: {
        [`${LINE_CATTLE}/${UNIT_1}`]: 'STRAY'
      }
    })
    expect(result.fulfilments[identificationDetails.id]).toBeUndefined()
  })
})

describe('V4 — description (same inverse gate as identificationDetails)', () => {
  it('is in scope for bees, out of scope for cattle', () => {
    const bees = evaluator.evaluate({
      [commodityCode.id]: { [LINE_BEES]: '01064100' }
    })
    const cattle = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: '0102' }
    })
    // With no unit storage the inScope flag reflects "any path in scope"
    // → for bees, the enumerated paths at unit level are empty, so
    // technically no records are in scope even though the gate would
    // permit them. Add a stored record to make bees concrete.
    const beesWithUnit = evaluator.evaluate({
      [commodityCode.id]: { [LINE_BEES]: '01064100' },
      [description.id]: { [`${LINE_BEES}/${UNIT_1}`]: 'Worker bees' }
    })
    expect(beesWithUnit.obligations[description.id].inScope).toBe(true)
    expect(cattle.obligations[description.id]).toEqual({ inScope: false })
    expect(bees.obligations[description.id]).toEqual({ inScope: false })
  })
})

// ---------------------------------------------------------------------------
// permanentAddress — depth-2 standard address block, commodity-gated
// ---------------------------------------------------------------------------

describe('V4 — permanentAddress (gatedBy for cats/dogs/ferrets)', () => {
  const petAddress = {
    name: 'Meadow Farm Distribution',
    addressLine1: 'Plot 8, Rural Enterprise Park',
    town: 'Peterborough',
    postCode: 'PE7 3BW',
    country: 'GB',
    telephone: '+44 1733 560890',
    email: 'intake@meadowfarm.co.uk'
  }

  it('is in scope for cats/dogs (01061900) with composite address value', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATSDOGS]: '01061900' },
      [permanentAddress.id]: { [`${LINE_CATSDOGS}/${UNIT_1}`]: petAddress }
    })
    expect(result.obligations[permanentAddress.id].inScope).toBe(true)
    expect(result.obligations[permanentAddress.id].reasons).toEqual([
      permanentAddressReason
    ])
    expect(result.obligations[permanentAddress.id].records).toEqual([
      { fulfilmentId: `${LINE_CATSDOGS}/${UNIT_1}`, status: 'mandatory' }
    ])
    expect(result.fulfilments[permanentAddress.id]).toEqual({
      [`${LINE_CATSDOGS}/${UNIT_1}`]: petAddress
    })
  })

  it('is out of scope for cattle', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: '0102' }
    })
    expect(result.obligations[permanentAddress.id]).toEqual({ inScope: false })
  })

  it('purges a stored permanentAddress on a non-cats/dogs line', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: '0102' },
      [permanentAddress.id]: { [`${LINE_CATTLE}/${UNIT_1}`]: petAddress }
    })
    expect(result.fulfilments[permanentAddress.id]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Mixed-lines interlock — different codes drive different identifiers per
// unit on the same evaluation
// ---------------------------------------------------------------------------

describe('V4 — mixed lines drive per-line identifier gating', () => {
  it('cattle + horse: passport applies to both, earTag only to cattle, horseName only to horse', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_CATTLE]: '0102',
        [LINE_HORSE]: '0101'
      },
      [passport.id]: {
        [`${LINE_CATTLE}/${UNIT_1}`]: 'UK-C-1',
        [`${LINE_HORSE}/${UNIT_1}`]: 'UK-H-1'
      },
      [earTag.id]: { [`${LINE_CATTLE}/${UNIT_1}`]: 'ET-1' },
      [horseName.id]: { [`${LINE_HORSE}/${UNIT_1}`]: 'Silver' }
    })
    const passportIds = new Set(
      result.obligations[passport.id].records.map((r) => r.fulfilmentId)
    )
    expect(passportIds).toEqual(
      new Set([`${LINE_CATTLE}/${UNIT_1}`, `${LINE_HORSE}/${UNIT_1}`])
    )

    const earTagIds = new Set(
      result.obligations[earTag.id].records.map((r) => r.fulfilmentId)
    )
    expect(earTagIds).toEqual(new Set([`${LINE_CATTLE}/${UNIT_1}`]))

    const horseNameIds = new Set(
      result.obligations[horseName.id].records.map((r) => r.fulfilmentId)
    )
    expect(horseNameIds).toEqual(new Set([`${LINE_HORSE}/${UNIT_1}`]))
  })
})

// ---------------------------------------------------------------------------
// Accompanying Documents — 0..10 user-driven indexed group. All four
// fields are plain `status: 'mandatory'` within the group: a document
// record demands its type, attachment, reference and date of issue
// alike (no per-record trigger). The cap rides `requires.maxEntries`
// via `groupInvariantErrors`.
// ---------------------------------------------------------------------------

const documentFields = [
  ['Type', accompanyingDocumentType],
  ['AttachmentType', accompanyingDocumentAttachmentType],
  ['Reference', accompanyingDocumentReference],
  ['DateOfIssue', accompanyingDocumentDateOfIssue]
]

describe('V4 — accompanying documents: no documents at all', () => {
  it.each([['documents group', documents], ...documentFields])(
    '%s is in scope with no records',
    (_name, obligation) => {
      const result = evaluator.evaluate({})
      expect(result.obligations[obligation.id]).toEqual({
        inScope: true,
        records: []
      })
    }
  )
})

describe('V4 — accompanying documents: every field is mandatory per record', () => {
  const withType = {
    [accompanyingDocumentType.id]: { d0: 'Veterinary health certificate' }
  }

  it('a document record appears once any of its fields is stored', () => {
    const result = evaluator.evaluate(withType)
    expect(result.obligations[documents.id]).toEqual({
      inScope: true,
      records: [{ fulfilmentId: 'd0' }]
    })
  })

  it.each(documentFields)(
    '%s is mandatory on an existing record',
    (_name, obligation) => {
      const result = evaluator.evaluate(withType)
      expect(result.obligations[obligation.id]).toEqual({
        inScope: true,
        records: [{ fulfilmentId: 'd0', status: 'mandatory' }]
      })
    }
  )
})

describe('V4 — accompanying documents: all four filled on one record', () => {
  const stored = {
    [accompanyingDocumentType.id]: { d0: 'Veterinary health certificate' },
    [accompanyingDocumentAttachmentType.id]: { d0: 'PDF' },
    [accompanyingDocumentReference.id]: { d0: 'GBHC1234567890' },
    [accompanyingDocumentDateOfIssue.id]: { d0: '2025-12-12' }
  }

  it.each(documentFields)(
    '%s is mandatory and its value round-trips',
    (_name, obligation) => {
      const result = evaluator.evaluate(stored)
      expect(result.obligations[obligation.id]).toEqual({
        inScope: true,
        records: [{ fulfilmentId: 'd0', status: 'mandatory' }]
      })
      expect(result.fulfilments[obligation.id]).toEqual(stored[obligation.id])
    }
  )
})

describe('V4 — accompanying documents: a partial record keeps every field owed', () => {
  it('a record with only a Reference keeps its other fields mandatory (nothing purged)', () => {
    const result = evaluator.evaluate({
      [accompanyingDocumentType.id]: { d0: 'Veterinary health certificate' },
      [accompanyingDocumentReference.id]: { d0: 'GBHC1234567890', d1: 'KEPT' }
    })
    expect(result.obligations[accompanyingDocumentReference.id]).toEqual({
      inScope: true,
      records: [
        { fulfilmentId: 'd0', status: 'mandatory' },
        { fulfilmentId: 'd1', status: 'mandatory' }
      ]
    })
    expect(result.fulfilments[accompanyingDocumentReference.id]).toEqual({
      d0: 'GBHC1234567890',
      d1: 'KEPT'
    })
  })
})

describe('V4 — accompanying documents: the 0..10 cap', () => {
  const recordsOf = (count) =>
    Object.fromEntries(
      Array.from({ length: count }, (_, i) => [`d${i}`, 'ITAHC'])
    )

  it('ten documents raise no invariant error', () => {
    const state = evaluator.evaluate({
      [accompanyingDocumentType.id]: recordsOf(10)
    })
    expect(groupInvariantErrors(documents, state)).toEqual([])
  })

  it('an eleventh document trips MAX_ENTRIES', () => {
    const state = evaluator.evaluate({
      [accompanyingDocumentType.id]: recordsOf(11)
    })
    expect(groupInvariantErrors(documents, state)).toEqual([
      {
        code: 'MAX_ENTRIES',
        groupId: documents.id,
        groupName: 'documents',
        errorCode: 'obligation.accompanyingDocument.tooMany',
        maxEntries: 10,
        actual: 11
      }
    ])
  })
})

// ---------------------------------------------------------------------------
// applyTo runs on the post-purge view (two-hop cascade)
// ---------------------------------------------------------------------------
//
// BRIEF §Migration #1 + REPORT §7 "Sharper than resurrection": within a
// single evaluate() call, an obligation's applyTo must read from the
// post-purge fulfilments, not the pre-purge `recognisedFulfilments`.
// Otherwise a value that this same evaluate call purges via one gate can
// still drive OTHER gates in the same call — the D2 in "G1 gates D; D
// gates D2".
//
// The scenario is unnatural in the shipped manifest (no live G-D-D2
// chain of purge-on-flip singles) so we exercise it via a synthetic
// three-obligation manifest driven through the full pipeline.
describe('evaluator — applyTo evaluates on the post-purge view (two-hop cascade)', () => {
  const g1 = {
    id: 'g1',
    name: 'g1',
    applyTo: () => ({ inScope: true, status: 'mandatory' })
  }
  const dependent = {
    id: 'd',
    name: 'd',
    applyTo: (fulfilments) =>
      fulfilments[g1.id] === 'open'
        ? { inScope: true, status: 'mandatory' }
        : { inScope: false }
  }
  const d2 = {
    id: 'd2',
    name: 'd2',
    applyTo: (fulfilments) =>
      fulfilments[dependent.id] === 'yes'
        ? { inScope: true, status: 'mandatory' }
        : { inScope: false }
  }
  const unrelated = {
    id: 'unrelated',
    name: 'unrelated',
    applyTo: () => ({ inScope: true, status: 'optional' })
  }
  const cascadeManifest = [g1, dependent, d2, unrelated]

  it('two-hop cascade: closing G1 purges D AND takes D2 out of scope in the same call', () => {
    const cascadeEvaluator = createObligationEvaluator({
      obligations: cascadeManifest
    })
    // Seed: gate open, dependent answered, downstream gated on the
    // dependent also answered.
    const result = cascadeEvaluator.evaluate({
      [g1.id]: 'closed',
      [dependent.id]: 'yes',
      [d2.id]: 'anything'
    })
    // D goes out of scope because G1 is closed — its value is purged.
    expect(result.fulfilments[dependent.id]).toBeUndefined()
    // Load-bearing: D2's applyTo reads D. With pre-purge evaluation,
    // D2's applyTo sees the stale `d: 'yes'` and D2 stays in scope —
    // its value survives the purge. With post-purge evaluation, D2's
    // applyTo sees `d: undefined` and D2 is out of scope, purging its
    // value too.
    expect(result.obligations[d2.id]).toEqual({ inScope: false })
    expect(result.fulfilments[d2.id]).toBeUndefined()
  })

  it('baseline: obligations whose applyTo does not depend on any purged value are unaffected', () => {
    const cascadeEvaluator = createObligationEvaluator({
      obligations: cascadeManifest
    })
    // Same seed as the cascade test — `unrelated` should stay in scope
    // regardless of the purge fan-out. Guards against the reorder
    // accidentally dropping obligations whose applyTo is a constant.
    const result = cascadeEvaluator.evaluate({
      [g1.id]: 'closed',
      [dependent.id]: 'yes',
      [d2.id]: 'anything',
      [unrelated.id]: 'kept'
    })
    expect(result.obligations[unrelated.id]).toEqual({
      inScope: true,
      status: 'optional'
    })
    expect(result.fulfilments[unrelated.id]).toBe('kept')
  })
})

// ---------------------------------------------------------------------------
// EUDPA-288 Phase 4.5.3 — trivial `applyTo` drop fidelity.
//
// 19 always-in-scope obligations previously carried a redundant
// `applyTo: () => ({ inScope: true, status: '<literal>' })` closure and
// `dependsOn: []`. This commit deletes both, leaving the data-only shape
// `{ id, name, status: '<literal>' }` that Phase 1.3's `within.id` deref
// guard made routable through the evaluator's `field` classifier
// (evaluator.js buildImplication → the "top-level scalar with intrinsic
// status" branch returns `{ inScope: true, status: obligation.status }`).
//
// The fidelity contract this block pins: for every one of the 19
// obligations, `evaluator.evaluate({})` returns EXACTLY the same
// decision object shape (`{ inScope: true, status: '<literal>' }`) it
// returned before the applyTo was removed. Any regression here means
// the classifier didn't route the obligation to the `field` category or
// the field branch produced a different shape.
//
// Captured pre-migration output (see PLAN.md §8.5 Phase 4.5.3): 18
// mandatory + 1 optional (`internalReferenceNumber`).
// ---------------------------------------------------------------------------

describe('Phase 4.5.3 — trivial applyTo drop fidelity (19 always-in-scope obligations)', () => {
  const trivialAlwaysMandatoryObligations = [
    ['poApprovedReferenceNumber', poApprovedReferenceNumber],
    ['responsiblePersonForLoad', responsiblePersonForLoad],
    ['countryOfOrigin', countryOfOrigin],
    ['regionCodeRequirement', regionCodeRequirement],
    ['reasonForImport', reasonForImport],
    ['placeOfOrigin', placeOfOrigin],
    ['consignor', consignor],
    ['consignee', consignee],
    ['importer', importer],
    ['placeOfDestination', placeOfDestination],
    ['transporterType', transporterType],
    ['meansOfTransport', meansOfTransport],
    ['transportIdentification', transportIdentification],
    ['transportDocumentReference', transportDocumentReference],
    ['arrivalDateAtPort', arrivalDateAtPort],
    ['portOfEntry', portOfEntry],
    ['contactAddress', contactAddress],
    ['animalsCertifiedFor', animalsCertifiedFor]
  ]

  it.each(trivialAlwaysMandatoryObligations)(
    '%s evaluates as { inScope: true, status: "mandatory" } on empty input (post-drop)',
    (_name, obligation) => {
      const result = evaluator.evaluate({})
      expect(result.obligations[obligation.id]).toEqual(mandatory)
    }
  )

  it('internalReferenceNumber evaluates as { inScope: true, status: "optional" } on empty input (post-drop)', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[internalReferenceNumber.id]).toEqual(optional)
  })

  it('none of the 19 obligations carry an applyTo closure any more (data-only shape)', () => {
    // Load-bearing invariant of the commit — the whole point of Phase
    // 4.5.3 is that these obligations are pure metadata. If someone
    // re-adds an `applyTo: () => (...)` to any of them, this fires.
    const stragglers = [
      poApprovedReferenceNumber,
      responsiblePersonForLoad,
      countryOfOrigin,
      regionCodeRequirement,
      reasonForImport,
      placeOfOrigin,
      consignor,
      consignee,
      importer,
      placeOfDestination,
      transporterType,
      meansOfTransport,
      transportIdentification,
      transportDocumentReference,
      arrivalDateAtPort,
      portOfEntry,
      contactAddress,
      internalReferenceNumber,
      animalsCertifiedFor
    ].filter((o) => typeof o.applyTo === 'function')
    expect(stragglers).toEqual([])
  })

  it('none of the 19 obligations carry a dependsOn key any more (derivable from no-applyTo)', () => {
    // Same shape guard as above — `dependsOn: []` was redundant with
    // "no gate = no dependencies". A future author reintroducing it
    // without an applyTo would drift the schema.
    const stragglers = [
      poApprovedReferenceNumber,
      responsiblePersonForLoad,
      countryOfOrigin,
      regionCodeRequirement,
      reasonForImport,
      placeOfOrigin,
      consignor,
      consignee,
      importer,
      placeOfDestination,
      transporterType,
      meansOfTransport,
      transportIdentification,
      transportDocumentReference,
      arrivalDateAtPort,
      portOfEntry,
      contactAddress,
      internalReferenceNumber,
      animalsCertifiedFor
    ].filter((o) => o.dependsOn !== undefined)
    expect(stragglers).toEqual([])
  })
})
