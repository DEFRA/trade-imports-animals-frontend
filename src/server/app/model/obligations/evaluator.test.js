import { describe, it, expect, beforeEach } from 'vitest'
import { createObligationEvaluator } from './evaluator.js'
import { groupInvariantErrors } from './state-queries.js'
import { obligationSet } from './manifest.js'
import {
  CATTLE_CODE,
  HORSES_CODE,
  OTHER_LIVE_MAMMALS_CODE
} from '../../sets/live-animals/services/commodities/rules.js'
import {
  BOS_TAURUS,
  OSTRICHES_CODE
} from '../../sets/live-animals/journeys/linear/features/commodities/search/test-support.js'

const {
  poApprovedReferenceNumber,
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
  speciesLatinName,
  numberOfAnimals,
  numberOfPackages,
  cph,
  unitRecord,
  microchip,
  passport,
  tattoo,
  earTag,
  horseName,
  permanentAddress,
  documents,
  accompanyingDocumentType,
  accompanyingDocumentAttachmentType,
  accompanyingDocumentReference,
  accompanyingDocumentDateOfIssue,
  documentUploadId,
  documentFilename
} = obligationSet()

let evaluator
beforeEach(() => {
  evaluator = createObligationEvaluator()
})

const mandatory = { inScope: true, status: 'mandatory' }
const optional = { inScope: true, status: 'optional' }
const outOfScope = { inScope: false }

const outOfScopeWhenNoCommodityLinesTitle =
  'is out of scope when no commodity lines exist'

const regionCodeRequiredReason = {
  code: 'obligation.regionCode.mandatory.becauseRegionCodeRequired',
  explanation: 'regionCode is mandatory when regionCodeRequirement is yes'
}

const purposeInInternalMarketReason = {
  code: 'obligation.purposeInInternalMarket.applicable.becauseInternalMarket',
  explanation:
    'purposeInInternalMarket applies when reasonForImport is internalMarket'
}

const commercialTransporterReason = {
  code: 'obligation.commercialTransporter.applicable.becauseCommercial',
  explanation:
    'commercialTransporter applies when transporterType is Commercial'
}

const privateTransporterReason = {
  code: 'obligation.privateTransporter.applicable.becausePrivate',
  explanation: 'privateTransporter applies when transporterType is Private'
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
    'CPH applies when any commodity line has a commodityCode that is not CPH-exempt'
}

const LINE_UNKNOWN = 'line1'
const LINE_OSTRICHES = 'line2'
const LINE_CATTLE = 'line4'
const LINE_HORSES = 'lineH'
const LINE_CATS = 'lineD'
const LINE_SECOND_HORSES = 'lineH2'
const LINE_SECOND_CATTLE = 'line5'

// Unit-instance-id mnemonics for depth-2 composite keys (`lineId.unitId`).
const UNIT_1 = 'unit1'
const UNIT_2 = 'unit2'

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
const permanentAddressReason = {
  code: 'obligation.permanentAddress.applicable.becausePermanentAddressLine',
  explanation:
    'permanentAddress applies on units of lines whose commodityCode and species pair is in the permanent-address list'
}

// A representative composite address value — the obligation model treats
// the address as an opaque single value; field-level validation is out
// of scope. Field names come from the Standard Address Block.
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

describe('smoke — evaluator wires up against fresh manifest', () => {
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

describe('always-mandatory notification-level singles', () => {
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

describe('countryOfOrigin round-trip', () => {
  it('stored value passes through and remains mandatory in-scope', () => {
    const result = evaluator.evaluate({ [countryOfOrigin.id]: 'France' })
    expect(result.fulfilments[countryOfOrigin.id]).toBe('France')
    expect(result.obligations[countryOfOrigin.id]).toEqual(mandatory)
  })
})

// ---------------------------------------------------------------------------
// regionCode conditional gate (retain-value pattern)
// ---------------------------------------------------------------------------

describe('regionCode conditional gate (retain-value)', () => {
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
    const fulfilments = {
      [regionCodeRequirement.id]: 'no',
      [regionCode.id]: 'FR-75'
    }
    const result = evaluator.evaluate(fulfilments)
    expect(result.fulfilments[regionCode.id]).toBe('FR-75')
    expect(result.obligations[regionCode.id]).toEqual(optional)
  })
})

// ---------------------------------------------------------------------------
// internalReferenceNumber (always-optional)
// ---------------------------------------------------------------------------

describe('internalReferenceNumber (always optional)', () => {
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

describe('purposeInInternalMarket conditional gate', () => {
  it('is out of scope when reasonForImport is absent', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[purposeInInternalMarket.id]).toEqual(outOfScope)
  })

  it('is out of scope when reasonForImport is not internalMarket', () => {
    const result = evaluator.evaluate({
      [reasonForImport.id]: 'transit'
    })
    expect(result.obligations[purposeInInternalMarket.id]).toEqual(outOfScope)
  })

  it('is mandatory in-scope when reasonForImport is internalMarket', () => {
    const result = evaluator.evaluate({
      [reasonForImport.id]: 'internalMarket'
    })
    expect(result.obligations[purposeInInternalMarket.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [purposeInInternalMarketReason]
    })
  })

  it('purges stored purpose when reasonForImport flips away from internalMarket', () => {
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

describe('transporterType → commercial vs private mutual exclusion', () => {
  it('both address blocks are out of scope when transporterType is absent', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[commercialTransporter.id]).toEqual(outOfScope)
    expect(result.obligations[privateTransporter.id]).toEqual(outOfScope)
  })

  it('commercial in-scope, private out-of-scope when type is Commercial', () => {
    const result = evaluator.evaluate({
      [transporterType.id]: 'Commercial'
    })
    expect(result.obligations[commercialTransporter.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [commercialTransporterReason]
    })
    expect(result.obligations[privateTransporter.id]).toEqual(outOfScope)
  })

  it('private in-scope, commercial out-of-scope when type is Private', () => {
    const result = evaluator.evaluate({
      [transporterType.id]: 'Private'
    })
    expect(result.obligations[commercialTransporter.id]).toEqual(outOfScope)
    expect(result.obligations[privateTransporter.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [privateTransporterReason]
    })
  })

  it('purges a stored commercialTransporter address when type flips to Private', () => {
    const result = evaluator.evaluate({
      [transporterType.id]: 'Private',
      [commercialTransporter.id]: alpineExporterAddress
    })
    expect(result.fulfilments[commercialTransporter.id]).toBeUndefined()
  })

  it('purges a stored privateTransporter address when type flips to Commercial', () => {
    const result = evaluator.evaluate({
      [transporterType.id]: 'Commercial',
      [privateTransporter.id]: alpineExporterAddress
    })
    expect(result.fulfilments[privateTransporter.id]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// meansOfTransport → transitedCountries multi-select gate
// ---------------------------------------------------------------------------

describe('transitedCountries conditional gate', () => {
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

describe('standard address blocks (composite value round-trip)', () => {
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

describe('commodity line group semantics', () => {
  it('has no fulfilmentIndexes when no commodity lines exist', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[commodityLine.id]).toEqual({
      inScope: true,
      fulfilmentIndexes: []
    })
  })

  it('infers a group fulfilmentIndex per line from commodityCode composite-key prefixes', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_HORSES]: HORSES_CODE,
        [LINE_CATS]: OTHER_LIVE_MAMMALS_CODE
      }
    })
    const ids = new Set(result.obligations[commodityLine.id].fulfilmentIndexes)
    expect(ids).toEqual(new Set([LINE_HORSES, LINE_CATS]))
  })

  it('unions fulfilmentIndexes across any descendant field fulfilment', () => {
    // Only numberOfAnimals is answered on the second line — the line's
    // presence is still inferred (no dedicated commodityCode entry required).
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_HORSES]: HORSES_CODE },
      [numberOfAnimals.id]: { [LINE_CATS]: 42 }
    })
    const ids = new Set(result.obligations[commodityLine.id].fulfilmentIndexes)
    expect(ids).toEqual(new Set([LINE_HORSES, LINE_CATS]))
  })
})

// ---------------------------------------------------------------------------
// Commodity line field fulfilments — per-line round-trip
// ---------------------------------------------------------------------------

describe('commodity line field fulfilments (round-trip)', () => {
  it('commodityCode stores one value per line', () => {
    const commodityCodeFulfilments = {
      [LINE_UNKNOWN]: 'Unicorn',
      [LINE_HORSES]: HORSES_CODE,
      [LINE_CATS]: OTHER_LIVE_MAMMALS_CODE
    }
    const result = evaluator.evaluate({
      [commodityCode.id]: commodityCodeFulfilments
    })
    expect(result.fulfilments[commodityCode.id]).toEqual(
      commodityCodeFulfilments
    )
  })

  it('commodityType stores one value per line', () => {
    const result = evaluator.evaluate({
      [commodityType.id]: { [LINE_HORSES]: 'Adult', [LINE_CATS]: 'Adult' }
    })
    expect(result.fulfilments[commodityType.id]).toEqual({
      [LINE_HORSES]: 'Adult',
      [LINE_CATS]: 'Adult'
    })
  })

  it('numberOfAnimals stores one whole-number value per line', () => {
    const result = evaluator.evaluate({
      [numberOfAnimals.id]: { [LINE_HORSES]: 250, [LINE_CATS]: 12 }
    })
    expect(result.fulfilments[numberOfAnimals.id]).toEqual({
      [LINE_HORSES]: 250,
      [LINE_CATS]: 12
    })
  })

  it('speciesLatinName stores an array of Latin names per line', () => {
    const result = evaluator.evaluate({
      [speciesLatinName.id]: {
        [LINE_OSTRICHES]: ['Struthio'],
        [LINE_CATTLE]: [BOS_TAURUS, 'Bison bison']
      }
    })
    expect(result.fulfilments[speciesLatinName.id]).toEqual({
      [LINE_OSTRICHES]: ['Struthio'],
      [LINE_CATTLE]: [BOS_TAURUS, 'Bison bison']
    })
  })
})

// ---------------------------------------------------------------------------
// numberOfPackages — derived-leaf reuse (commodity-code-gated per line)
// ---------------------------------------------------------------------------

describe('numberOfPackages (derived-leaf, commodity-code-gated)', () => {
  it(outOfScopeWhenNoCommodityLinesTitle, () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[numberOfPackages.id]).toEqual(outOfScope)
  })

  it('is out of scope when no line has a package-count commodity', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_OSTRICHES]: OSTRICHES_CODE }
    })
    expect(result.obligations[numberOfPackages.id]).toEqual(outOfScope)
  })

  it('is in scope with reason on a matching line', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_HORSES]: HORSES_CODE }
    })
    expect(result.obligations[numberOfPackages.id]).toEqual({
      inScope: true,
      reasons: [numberOfPackagesReason],
      status: 'optional',
      fulfilmentIndexes: [LINE_HORSES]
    })
  })

  it('fulfilmentIndexes list contains only matching line ids (mixed manifest)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_OSTRICHES]: OSTRICHES_CODE,
        [LINE_HORSES]: HORSES_CODE,
        [LINE_CATS]: OTHER_LIVE_MAMMALS_CODE
      }
    })
    const ids = result.obligations[numberOfPackages.id].fulfilmentIndexes
    expect(new Set(ids)).toEqual(new Set([LINE_HORSES, LINE_CATS]))
  })

  it('keeps a stored value on a matching line (round-trip)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_HORSES]: HORSES_CODE },
      [numberOfPackages.id]: { [LINE_HORSES]: 3 }
    })
    expect(result.fulfilments[numberOfPackages.id]).toEqual({
      [LINE_HORSES]: 3
    })
  })

  it('purges a stored value on a non-matching line', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_OSTRICHES]: OSTRICHES_CODE },
      [numberOfPackages.id]: { [LINE_OSTRICHES]: 7 }
    })
    expect(result.fulfilments[numberOfPackages.id]).toBeUndefined()
  })

  it('keeps matching-line values, purges non-matching-line values (mixed)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_OSTRICHES]: OSTRICHES_CODE,
        [LINE_HORSES]: HORSES_CODE,
        [LINE_CATS]: OTHER_LIVE_MAMMALS_CODE
      },
      [numberOfPackages.id]: {
        [LINE_OSTRICHES]: 7, // should be purged
        [LINE_HORSES]: 3 // should survive
        // LINE_CATS unanswered
      }
    })
    expect(result.fulfilments[numberOfPackages.id]).toEqual({
      [LINE_HORSES]: 3
    })
  })

  // Identity comes from line-instance-id, not commodity value — a value-keyed
  // shape would collapse here.
  it('supports two lines sharing the same matching commodity', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_HORSES]: HORSES_CODE,
        [LINE_SECOND_HORSES]: HORSES_CODE
      },
      [numberOfPackages.id]: {
        [LINE_HORSES]: 3,
        [LINE_SECOND_HORSES]: 5
      }
    })
    expect(result.fulfilments[numberOfPackages.id]).toEqual({
      [LINE_HORSES]: 3,
      [LINE_SECOND_HORSES]: 5
    })
    const ids = result.obligations[numberOfPackages.id].fulfilmentIndexes
    expect(new Set(ids)).toEqual(new Set([LINE_HORSES, LINE_SECOND_HORSES]))
  })
})

// ---------------------------------------------------------------------------
// CPH — notification-level single reading nested storage
// ---------------------------------------------------------------------------

describe('cph (notification-level, reads commodityCode storage)', () => {
  it(outOfScopeWhenNoCommodityLinesTitle, () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[cph.id]).toEqual(outOfScope)
  })

  it('is out of scope when every line is CPH-exempt', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_HORSES]: HORSES_CODE,
        [LINE_CATS]: OTHER_LIVE_MAMMALS_CODE
      }
    })
    expect(result.obligations[cph.id]).toEqual(outOfScope)
  })

  it('is mandatory in-scope when at least one line is not CPH-exempt', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_HORSES]: HORSES_CODE,
        [LINE_CATTLE]: CATTLE_CODE
      }
    })
    expect(result.obligations[cph.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [cphReason]
    })
  })

  it('keeps a stored cph value when a line is not CPH-exempt', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: CATTLE_CODE },
      [cph.id]: '123456789'
    })
    expect(result.fulfilments[cph.id]).toBe('123456789')
  })

  it('purges a stored cph value when every line is CPH-exempt', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_HORSES]: HORSES_CODE },
      [cph.id]: '123456789'
    })
    expect(result.fulfilments[cph.id]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Interlock — one cattle line triggers both packages and CPH gates
// ---------------------------------------------------------------------------

describe('cattle line triggers both packages and CPH gates', () => {
  it('activates numberOfPackages (per-line) and cph (notification-level) simultaneously', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: CATTLE_CODE }
    })
    expect(result.obligations[numberOfPackages.id].fulfilmentIndexes).toEqual([
      LINE_CATTLE
    ])
    expect(result.obligations[cph.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [cphReason]
    })
  })
})

// ---------------------------------------------------------------------------
// `unitRecord` — nested user-driven indexed group inside commodityLine
// (depth-2). Instance-ids inferred from descendant field-fulfilment
// composite-key prefixes.
// ---------------------------------------------------------------------------

describe('unitRecord group semantics', () => {
  it('has no fulfilmentIndexes when no unit-level obligations have storage', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: CATTLE_CODE }
    })
    expect(result.obligations[unitRecord.id]).toEqual({
      inScope: true,
      fulfilmentIndexes: []
    })
  })

  it('infers unit-instance paths from a per-unit identifier storage', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: CATTLE_CODE },
      [passport.id]: {
        [`${LINE_CATTLE}.${UNIT_1}`]: 'UK123',
        [`${LINE_CATTLE}.${UNIT_2}`]: 'UK456'
      }
    })
    const ids = new Set(result.obligations[unitRecord.id].fulfilmentIndexes)
    expect(ids).toEqual(
      new Set([`${LINE_CATTLE}.${UNIT_1}`, `${LINE_CATTLE}.${UNIT_2}`])
    )
  })

  it('unions unit-instance paths across multiple identifier storages', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: CATTLE_CODE },
      [passport.id]: { [`${LINE_CATTLE}.${UNIT_1}`]: 'UK123' },
      [earTag.id]: { [`${LINE_CATTLE}.${UNIT_2}`]: 'UK-EAR-999' }
    })
    const ids = new Set(result.obligations[unitRecord.id].fulfilmentIndexes)
    expect(ids).toEqual(
      new Set([`${LINE_CATTLE}.${UNIT_1}`, `${LINE_CATTLE}.${UNIT_2}`])
    )
  })
})

// ---------------------------------------------------------------------------
// passport — commodity-gated per-unit identifier (gatedBy, depth-2)
// ---------------------------------------------------------------------------

describe('passport (gatedBy allowListed(commodityCode, passport list))', () => {
  it(outOfScopeWhenNoCommodityLinesTitle, () => {
    expect(evaluator.evaluate({}).obligations[passport.id]).toEqual({
      inScope: false
    })
  })

  it('is out of scope for lines with non-passport commodities', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_OSTRICHES]: OSTRICHES_CODE }
    })
    expect(result.obligations[passport.id]).toEqual({ inScope: false })
  })

  it('is in scope with one fulfilmentIndex per unit under a passport-list line', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: CATTLE_CODE },
      [passport.id]: {
        [`${LINE_CATTLE}.${UNIT_1}`]: 'UK123',
        [`${LINE_CATTLE}.${UNIT_2}`]: 'UK456'
      }
    })
    expect(result.obligations[passport.id].inScope).toBe(true)
    expect(result.obligations[passport.id].reasons).toEqual([passportReason])
    const ids = new Set(result.obligations[passport.id].fulfilmentIndexes)
    expect(ids).toEqual(
      new Set([`${LINE_CATTLE}.${UNIT_1}`, `${LINE_CATTLE}.${UNIT_2}`])
    )
  })

  it('keeps a stored passport value on a matching-line unit (round-trip)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: CATTLE_CODE },
      [passport.id]: { [`${LINE_CATTLE}.${UNIT_1}`]: 'UK123' }
    })
    expect(result.fulfilments[passport.id]).toEqual({
      [`${LINE_CATTLE}.${UNIT_1}`]: 'UK123'
    })
  })

  it('purges a stored passport value on a non-matching-line unit', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_OSTRICHES]: OSTRICHES_CODE },
      [passport.id]: { [`${LINE_OSTRICHES}.${UNIT_1}`]: 'STRAY' }
    })
    expect(result.fulfilments[passport.id]).toBeUndefined()
  })

  it('keeps matching-line values, purges non-matching (mixed lines)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_OSTRICHES]: OSTRICHES_CODE,
        [LINE_CATTLE]: CATTLE_CODE
      },
      [passport.id]: {
        [`${LINE_OSTRICHES}.${UNIT_1}`]: 'STRAY',
        [`${LINE_CATTLE}.${UNIT_1}`]: 'UK123'
      }
    })
    expect(result.fulfilments[passport.id]).toEqual({
      [`${LINE_CATTLE}.${UNIT_1}`]: 'UK123'
    })
  })
})

// ---------------------------------------------------------------------------
// tattoo / earTag / horseName — same gatedBy shape, different whitelists
// ---------------------------------------------------------------------------

describe('tattoo (gatedBy allowListed(commodityCode, tattoo list))', () => {
  it('is in scope for a 01061900 line (01061900 in the tattoo list)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATS]: OTHER_LIVE_MAMMALS_CODE },
      [tattoo.id]: { [`${LINE_CATS}.${UNIT_1}`]: 'CT-99' }
    })
    expect(result.obligations[tattoo.id].inScope).toBe(true)
    expect(result.obligations[tattoo.id].reasons).toEqual([tattooReason])
  })

  it('is out of scope for a 0101 line (0101 not in the tattoo list)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_HORSES]: HORSES_CODE }
    })
    expect(result.obligations[tattoo.id]).toEqual({ inScope: false })
  })

  // The ear tag value is stored so a unit instance is enumerated and the
  // commodity gate — not an empty unitRecord — is what puts the tattoo out of
  // scope.
  it('is out of scope for a 0102 line (0102 not in the tattoo list)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: CATTLE_CODE },
      [earTag.id]: { [`${LINE_CATTLE}.${UNIT_1}`]: 'UK123456789012' }
    })
    expect(result.obligations[tattoo.id]).toEqual({ inScope: false })
  })
})

describe('earTag (gatedBy allowListed(commodityCode, ear-tag list))', () => {
  it('is in scope across two 0102 lines', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_CATTLE]: CATTLE_CODE,
        [LINE_SECOND_CATTLE]: CATTLE_CODE
      },
      [earTag.id]: {
        [`${LINE_CATTLE}.${UNIT_1}`]: 'UK-COW-1',
        [`${LINE_SECOND_CATTLE}.${UNIT_1}`]: 'UK-COW-2'
      }
    })
    expect(result.obligations[earTag.id].inScope).toBe(true)
    expect(result.obligations[earTag.id].reasons).toEqual([earTagReason])
    const ids = new Set(result.obligations[earTag.id].fulfilmentIndexes)
    expect(ids).toEqual(
      new Set([`${LINE_CATTLE}.${UNIT_1}`, `${LINE_SECOND_CATTLE}.${UNIT_1}`])
    )
  })

  it('is out of scope for a 01061900 line (01061900 not in the ear-tag list)', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATS]: OTHER_LIVE_MAMMALS_CODE }
    })
    expect(result.obligations[earTag.id]).toEqual({ inScope: false })
  })
})

describe('horseName (gatedBy allowListed(commodityCode, horse-name list))', () => {
  it('is in scope for a 0101 line', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_HORSES]: HORSES_CODE },
      [horseName.id]: { [`${LINE_HORSES}.${UNIT_1}`]: 'Silver' }
    })
    expect(result.obligations[horseName.id].inScope).toBe(true)
    expect(result.obligations[horseName.id].reasons).toEqual([horseNameReason])
  })

  it('is out of scope for a 0102 line', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: CATTLE_CODE }
    })
    expect(result.obligations[horseName.id]).toEqual({ inScope: false })
  })
})

describe('a commodity with no identifier type of its own', () => {
  it('puts no identifier obligation in scope on an ostrich line', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_OSTRICHES]: OSTRICHES_CODE },
      [earTag.id]: { [`${LINE_OSTRICHES}.${UNIT_1}`]: 'STRAY' }
    })
    for (const identifier of [microchip, passport, tattoo, earTag, horseName]) {
      expect(result.obligations[identifier.id]).toEqual({ inScope: false })
    }
  })

  it('puts the commodity’s own identifiers in scope on the same shape of 0102 line', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: CATTLE_CODE },
      [earTag.id]: { [`${LINE_CATTLE}.${UNIT_1}`]: 'UK123456789012' }
    })
    expect(result.obligations[earTag.id].inScope).toBe(true)
    expect(result.obligations[passport.id].inScope).toBe(true)
    expect(result.obligations[horseName.id]).toEqual({ inScope: false })
    expect(result.obligations[tattoo.id]).toEqual({ inScope: false })
  })

  it('purges an identifier value smuggled onto an ostrich unit', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_OSTRICHES]: OSTRICHES_CODE },
      [earTag.id]: { [`${LINE_OSTRICHES}.${UNIT_1}`]: 'STRAY' }
    })
    expect(result.fulfilments[earTag.id]).toBeUndefined()
  })

  it('leaves the at-least-one-identifier rule with nothing to ask on such a line', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_OSTRICHES]: OSTRICHES_CODE },
      [numberOfAnimals.id]: { [LINE_OSTRICHES]: 2 }
    })
    expect(groupInvariantErrors(unitRecord, result)).toEqual([])
  })
})

describe('permanentAddress (gated on commodity code and species Latin name)', () => {
  const petAddress = {
    name: 'Meadow Farm Distribution',
    addressLine1: 'Plot 8, Rural Enterprise Park',
    town: 'Peterborough',
    postCode: 'PE7 3BW',
    country: 'GB',
    telephone: '+44 1733 560890',
    email: 'intake@meadowfarm.co.uk'
  }

  it('is in scope for Felis catus under 01061900 with a composite address value', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATS]: OTHER_LIVE_MAMMALS_CODE },
      [speciesLatinName.id]: { [LINE_CATS]: 'Felis catus' },
      [permanentAddress.id]: { [`${LINE_CATS}.${UNIT_1}`]: petAddress }
    })
    expect(result.obligations[permanentAddress.id].inScope).toBe(true)
    expect(result.obligations[permanentAddress.id].reasons).toEqual([
      permanentAddressReason
    ])
    expect(result.obligations[permanentAddress.id].status).toBe('mandatory')
    expect(result.obligations[permanentAddress.id].fulfilmentIndexes).toEqual([
      `${LINE_CATS}.${UNIT_1}`
    ])
    expect(result.fulfilments[permanentAddress.id]).toEqual({
      [`${LINE_CATS}.${UNIT_1}`]: petAddress
    })
  })

  it('is out of scope for Bos taurus under 0102', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: CATTLE_CODE },
      [speciesLatinName.id]: { [LINE_CATTLE]: BOS_TAURUS }
    })
    expect(result.obligations[permanentAddress.id]).toEqual({ inScope: false })
  })

  it('is out of scope for Oryctolagus cuniculus under 01061900', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATS]: OTHER_LIVE_MAMMALS_CODE },
      [speciesLatinName.id]: { [LINE_CATS]: 'Oryctolagus cuniculus' }
    })
    expect(result.obligations[permanentAddress.id]).toEqual({ inScope: false })
  })

  it('purges a stored permanentAddress on a Bos taurus line under 0102', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: { [LINE_CATTLE]: CATTLE_CODE },
      [speciesLatinName.id]: { [LINE_CATTLE]: BOS_TAURUS },
      [permanentAddress.id]: { [`${LINE_CATTLE}.${UNIT_1}`]: petAddress }
    })
    expect(result.fulfilments[permanentAddress.id]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Mixed-lines interlock — different codes drive different identifiers per
// unit on the same evaluation
// ---------------------------------------------------------------------------

describe('mixed lines drive per-line identifier gating', () => {
  it('0102 + 0101: passport applies to both, earTag only to 0102, horseName only to 0101', () => {
    const result = evaluator.evaluate({
      [commodityCode.id]: {
        [LINE_CATTLE]: CATTLE_CODE,
        [LINE_HORSES]: HORSES_CODE
      },
      [passport.id]: {
        [`${LINE_CATTLE}.${UNIT_1}`]: 'UK-C-1',
        [`${LINE_HORSES}.${UNIT_1}`]: 'UK-H-1'
      },
      [earTag.id]: { [`${LINE_CATTLE}.${UNIT_1}`]: 'ET-1' },
      [horseName.id]: { [`${LINE_HORSES}.${UNIT_1}`]: 'Silver' }
    })
    const passportIds = new Set(
      result.obligations[passport.id].fulfilmentIndexes
    )
    expect(passportIds).toEqual(
      new Set([`${LINE_CATTLE}.${UNIT_1}`, `${LINE_HORSES}.${UNIT_1}`])
    )

    const earTagIds = new Set(result.obligations[earTag.id].fulfilmentIndexes)
    expect(earTagIds).toEqual(new Set([`${LINE_CATTLE}.${UNIT_1}`]))

    const horseNameIds = new Set(
      result.obligations[horseName.id].fulfilmentIndexes
    )
    expect(horseNameIds).toEqual(new Set([`${LINE_HORSES}.${UNIT_1}`]))
  })
})

// ---------------------------------------------------------------------------
// Accompanying Documents — 0..15 user-driven indexed group. The four
// document metadata fields are plain `status: 'mandatory'` within the
// group; the upload-return fields are optional. The cap rides
// `requires.maxEntries` via `groupInvariantErrors`.
// ---------------------------------------------------------------------------

const documentFields = [
  ['Type', accompanyingDocumentType],
  ['AttachmentType', accompanyingDocumentAttachmentType],
  ['Reference', accompanyingDocumentReference],
  ['DateOfIssue', accompanyingDocumentDateOfIssue]
]

const optionalDocumentFields = [
  ['UploadId', documentUploadId],
  ['Filename', documentFilename]
]

const inScopeWithNoFulfilmentIndexesTitle =
  '%s is in scope with no fulfilmentIndexes'

describe('accompanying documents: no documents at all', () => {
  it.each([['documents group', documents]])(
    inScopeWithNoFulfilmentIndexesTitle,
    (_name, obligation) => {
      const result = evaluator.evaluate({})
      expect(result.obligations[obligation.id]).toEqual({
        inScope: true,
        fulfilmentIndexes: []
      })
    }
  )

  it.each(documentFields)(
    inScopeWithNoFulfilmentIndexesTitle,
    (_name, obligation) => {
      const result = evaluator.evaluate({})
      expect(result.obligations[obligation.id]).toEqual({
        inScope: true,
        status: 'mandatory',
        fulfilmentIndexes: []
      })
    }
  )

  it.each(optionalDocumentFields)(
    inScopeWithNoFulfilmentIndexesTitle,
    (_name, obligation) => {
      const result = evaluator.evaluate({})
      expect(result.obligations[obligation.id]).toEqual({
        inScope: true,
        status: 'optional',
        fulfilmentIndexes: []
      })
    }
  )
})

describe('accompanying documents: upload returns are optional obligations', () => {
  const uploadOnly = {
    [documentUploadId.id]: { d0: 'upload-001' },
    [documentFilename.id]: { d0: 'certificate.pdf' }
  }

  it('an upload-only document is a visible group instance', () => {
    const result = evaluator.evaluate(uploadOnly)
    expect(result.obligations[documents.id]).toEqual({
      inScope: true,
      fulfilmentIndexes: ['d0']
    })
  })

  it.each(optionalDocumentFields)(
    '%s is optional and its value round-trips',
    (_name, obligation) => {
      const result = evaluator.evaluate(uploadOnly)
      expect(result.obligations[obligation.id]).toEqual({
        inScope: true,
        status: 'optional',
        fulfilmentIndexes: ['d0']
      })
      expect(result.fulfilments[obligation.id]).toEqual(
        uploadOnly[obligation.id]
      )
    }
  )

  it.each(documentFields)(
    '%s remains mandatory on an upload-only document',
    (_name, obligation) => {
      const result = evaluator.evaluate(uploadOnly)
      expect(result.obligations[obligation.id]).toEqual({
        inScope: true,
        status: 'mandatory',
        fulfilmentIndexes: ['d0']
      })
    }
  )
})

describe('accompanying documents: four metadata fields are mandatory per document', () => {
  const withType = {
    [accompanyingDocumentType.id]: { d0: 'VETERINARY_HEALTH_CERTIFICATE' }
  }

  it('a document appears once any of its fields is stored', () => {
    const result = evaluator.evaluate(withType)
    expect(result.obligations[documents.id]).toEqual({
      inScope: true,
      fulfilmentIndexes: ['d0']
    })
  })

  it.each(documentFields)(
    '%s is mandatory on an existing document',
    (_name, obligation) => {
      const result = evaluator.evaluate(withType)
      expect(result.obligations[obligation.id]).toEqual({
        inScope: true,
        status: 'mandatory',
        fulfilmentIndexes: ['d0']
      })
    }
  )
})

describe('accompanying documents: all four filled on one document', () => {
  const fulfilments = {
    [accompanyingDocumentType.id]: { d0: 'VETERINARY_HEALTH_CERTIFICATE' },
    [accompanyingDocumentAttachmentType.id]: { d0: 'PDF' },
    [accompanyingDocumentReference.id]: { d0: 'GBHC1234567890' },
    [accompanyingDocumentDateOfIssue.id]: { d0: '2025-12-12' }
  }

  it.each(documentFields)(
    '%s is mandatory and its value round-trips',
    (_name, obligation) => {
      const result = evaluator.evaluate(fulfilments)
      expect(result.obligations[obligation.id]).toEqual({
        inScope: true,
        status: 'mandatory',
        fulfilmentIndexes: ['d0']
      })
      expect(result.fulfilments[obligation.id]).toEqual(
        fulfilments[obligation.id]
      )
    }
  )
})

describe('accompanying documents: a partial document keeps every field owed', () => {
  it('a document with only a Reference keeps its other fields mandatory (nothing purged)', () => {
    const result = evaluator.evaluate({
      [accompanyingDocumentType.id]: { d0: 'VETERINARY_HEALTH_CERTIFICATE' },
      [accompanyingDocumentReference.id]: { d0: 'GBHC1234567890', d1: 'KEPT' }
    })
    expect(result.obligations[accompanyingDocumentReference.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      fulfilmentIndexes: ['d0', 'd1']
    })
    expect(result.fulfilments[accompanyingDocumentReference.id]).toEqual({
      d0: 'GBHC1234567890',
      d1: 'KEPT'
    })
  })
})

describe('accompanying documents: the 0..15 cap', () => {
  const documentsOf = (count) =>
    Object.fromEntries(
      Array.from({ length: count }, (_, i) => [`d${i}`, 'ITAHC'])
    )

  it('fifteen inferred upload-only document instances raise no invariant error', () => {
    const state = evaluator.evaluate({
      [documentUploadId.id]: documentsOf(15)
    })
    expect(groupInvariantErrors(documents, state)).toEqual([])
  })

  it('a sixteenth inferred upload-only document instance trips MAX_ENTRIES', () => {
    const state = evaluator.evaluate({
      [documentUploadId.id]: documentsOf(16)
    })
    expect(groupInvariantErrors(documents, state)).toEqual([
      {
        code: 'MAX_ENTRIES',
        groupId: documents.id,
        groupName: 'documents',
        errorCode: 'obligation.accompanyingDocument.tooMany',
        maxEntries: 15,
        actual: 16
      }
    ])
  })
})

// ---------------------------------------------------------------------------
// applyTo runs on the post-purge view (two-hop cascade)
// ---------------------------------------------------------------------------
//
// Within a single evaluate() call, an obligation's applyTo must read from
// the post-purge fulfilments, not the pre-purge `recognisedFulfilments`.
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
// Trivial `applyTo` drop fidelity.
//
// 18 always-in-scope obligations use the data-only shape
// `{ id, name, status: '<literal>' }` with no `applyTo` closure and no
// `dependsOn`. They classify as `'unindexed'` (Phase 1.4 folded the
// former no-within `'field'` case in) and `unindexedImplication` falls
// through to `{ inScope: true, status: obligation.status }` when no
// applicabilityDecision is present.
//
// The fidelity contract this block pins: for every one of the 18
// obligations, `evaluator.evaluate({})` returns EXACTLY the decision
// object shape `{ inScope: true, status: '<literal>' }`. Any regression
// here means the classifier didn't route the obligation to the
// `'unindexed'` category or the constructor produced a different shape.
//
// Expected split: 17 mandatory + 1 optional (`internalReferenceNumber`).
// ---------------------------------------------------------------------------

describe('trivial applyTo drop fidelity (18 always-in-scope obligations)', () => {
  const trivialAlwaysMandatoryObligations = [
    ['poApprovedReferenceNumber', poApprovedReferenceNumber],
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

  it('none of the 18 obligations carry an applyTo closure any more (data-only shape)', () => {
    // Load-bearing invariant of the commit — the whole point of Phase
    // 4.5.3 is that these obligations are pure metadata. If someone
    // re-adds an `applyTo: () => (...)` to any of them, this fires.
    const stragglers = [
      poApprovedReferenceNumber,
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

  it('none of the 18 obligations carry a dependsOn key any more (derivable from no-applyTo)', () => {
    // Same shape guard as above — `dependsOn: []` was redundant with
    // "no gate = no dependencies". A future author reintroducing it
    // without an applyTo would drift the schema.
    const stragglers = [
      poApprovedReferenceNumber,
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
