/**
 * Domain — Layer 1.25 of the three-layer architecture.
 *
 * Owns "what is a legal value?" — enum options, predicates, cross-field
 * rules — keyed by obligation id. Nothing about identity, cardinality,
 * or scope: those live in the obligations manifest (Layer 1). Nothing
 * about pages, sections, or navigation: those live in the flow (Layer
 * 2).
 *
 * Entries are pure functions of state. Same idiom as an obligation's
 * `applyTo`: read from `fulfilments`.
 *
 * Entry shapes:
 *   { type: 'enum',    options: (fulfilments, ctx?) → string[], labels? }
 *   { type: 'integer', predicate: (value, ctx) → error[], reasons: [...] }
 *   { type: 'string',  predicate: (value, ctx) → error[], reasons: [...] }
 *   { type: 'date',    predicate: (value, ctx) → error[], reasons: [...] }
 *
 * Helper factories (`staticEnum`, `computedEnum`, `predicate`) attach a
 * `.metadata` sidecar mirroring the obligations `helpers.js` pattern —
 * the data-dictionary sketch introspects it.
 *
 * All predicates in this file map to real V4 rules from the Confluence
 * page "Live Animals Data Fields - V4" (page id 6497338582).
 */

import {
  reasonForImport,
  purposeInInternalMarket,
  transporterType,
  meansOfTransport,
  transportIdentification,
  transportDocumentReference,
  transitedCountries,
  arrivalDateAtPort,
  internalReferenceNumber,
  animalsCertifiedFor,
  countryOfOrigin,
  commodityCode,
  commodityType,
  numberOfPackages,
  numberOfAnimals,
  cph,
  containsUnweanedAnimals,
  regionCodeRequirement,
  regionCode,
  portOfEntry,
  species,
  commercialTransporter,
  privateTransporter,
  placeOfOrigin,
  consignor,
  consignee,
  importer,
  placeOfDestination,
  contactAddress
} from '../obligations/obligations.js'

// ---------------------------------------------------------------------------
// Reason constants — one per distinct failure code. Exported so tests
// and error-formatting code can name-check them.
// ---------------------------------------------------------------------------

export const reasons = {
  enumNotInOptions: {
    code: 'domain.enum.notInOptions',
    explanation: 'value must be one of the currently-legal options'
  },
  stringMaxLength: {
    code: 'domain.string.maxLength',
    explanation: 'value exceeds the maximum allowed character length'
  },
  stringRequired: {
    code: 'domain.string.required',
    explanation: 'value is required'
  },
  integerMin: {
    code: 'domain.integer.min',
    explanation: 'value is below the allowed minimum'
  },
  integerMaxDigits: {
    code: 'domain.integer.maxDigits',
    explanation: 'value exceeds the allowed number of digits'
  },
  dateFormat: {
    code: 'domain.date.format',
    explanation: 'value must be a valid DD/MM/YYYY date'
  },
  arrayMaxSelections: {
    code: 'domain.array.maxSelections',
    explanation: 'too many items selected'
  },
  numberOfAnimalsSpeciesCap: {
    code: 'domain.numberOfAnimals.speciesCap',
    explanation:
      'value exceeds the per-species animal-count cap for the least-permissive selected species on this line'
  },
  addressSubFieldRequired: {
    code: 'domain.address.subFieldRequired',
    explanation: 'a required sub-field of the address is missing or blank'
  }
}

// ---------------------------------------------------------------------------
// Entry-shape factories — parallel to `helpers.js` in obligations.
// Each attaches `.metadata` for introspection and takes an optional
// `{ labels }` sidecar so the renderer has human-readable option copy.
// ---------------------------------------------------------------------------

// Static enum — options do not depend on state.
export function staticEnum(options, { labels } = {}) {
  const entry = {
    type: 'enum',
    options: () => options
  }
  entry.labels = labels ?? {}
  entry.metadata = { shape: 'staticEnum', options, labels: entry.labels }
  return entry
}

// Computed enum — options depend on state via a pure function.
// `readsFrom` (metadata-only) names the sibling obligations the closure
// reads; the data-dictionary sketch uses it for a static-reachability
// view without running the closure.
export function computedEnum(fn, readsFrom = [], { labels } = {}) {
  const entry = { type: 'enum', options: fn }
  entry.labels = labels ?? {}
  entry.metadata = {
    shape: 'computedEnum',
    readsFrom: readsFrom.map((o) => o.name),
    labels: entry.labels
  }
  return entry
}

// Predicate — the predicate returns an array of error objects (empty on
// pass). `reasons` (metadata) enumerates every failure code the
// predicate can emit so the dictionary can list them without executing
// the closure.
export function predicate(type, fn, reasons) {
  const entry = { type, predicate: fn, reasons }
  entry.metadata = { shape: 'predicate', reasons: reasons.map((r) => r.code) }
  return entry
}

// Address-block composite. Value is a plain object keyed by sub-field
// name; the widget renders one govukInput per subField, the payload
// gatherer collects `${id}__${subField}` fields into that object.
// Fires `addressSubFieldRequired` per empty required sub-field so the
// error summary + inline errors surface the exact missing field.
export function addressBlock(obligation, { subFields, required } = {}) {
  return {
    type: 'address',
    subFields,
    required,
    predicate: (value, ctx) => {
      if (value === undefined || value === null) return []
      if (typeof value !== 'object' || Array.isArray(value)) return []
      const errors = []
      for (const sub of required ?? []) {
        const leaf = value[sub]
        if (leaf === undefined || leaf === null || leaf === '') {
          errors.push({
            code: reasons.addressSubFieldRequired.code,
            obligation: obligation.name,
            path: ctx.path,
            subField: sub
          })
        }
      }
      return errors
    },
    metadata: {
      shape: 'addressBlock',
      subFields,
      required,
      reasons: [reasons.addressSubFieldRequired.code]
    }
  }
}

// ---------------------------------------------------------------------------
// Shared predicate helpers — pure. Every V4 rule maps to one of these
// or a small composition of them.
// ---------------------------------------------------------------------------

function stringMaxLength(max, obligation) {
  return (value, ctx) => {
    if (typeof value !== 'string') return []
    if (value.length > max) {
      return [
        {
          code: reasons.stringMaxLength.code,
          obligation: obligation.name,
          path: ctx.path,
          max,
          actual: value.length
        }
      ]
    }
    return []
  }
}

// DD/MM/YYYY, calendar-valid (no 31 Feb; leap-year correct).
function parseDdMmYyyy(value) {
  if (typeof value !== 'string') return null
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return null
  const [, dd, mm, yyyy] = match
  const day = Number.parseInt(dd, 10)
  const month = Number.parseInt(mm, 10)
  const year = Number.parseInt(yyyy, 10)
  const date = new Date(Date.UTC(year, month - 1, day))
  const roundTrip =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  return roundTrip ? date : null
}

// ---------------------------------------------------------------------------
// V4 static enums — small subsets big enough to exercise the widget +
// task-list patterns. Full V4 lists come from MDM in production.
// ---------------------------------------------------------------------------

const REASON_FOR_IMPORT_OPTIONS = [
  'internal-market',
  'transit-through-eu',
  'temporary-admission',
  're-entry-after-refusal'
]

export const reasonForImportDomain = staticEnum(REASON_FOR_IMPORT_OPTIONS, {
  labels: {
    'internal-market': 'domain.reasonForImport.internal-market',
    'transit-through-eu': 'domain.reasonForImport.transit-through-eu',
    'temporary-admission': 'domain.reasonForImport.temporary-admission',
    're-entry-after-refusal': 'domain.reasonForImport.re-entry-after-refusal'
  }
})

const PURPOSE_BY_REASON = {
  'internal-market': ['breeding', 'slaughter', 'fattening', 'other']
}

export const purposeInInternalMarketDomain = computedEnum(
  (fulfilments) => PURPOSE_BY_REASON[fulfilments[reasonForImport.id]] ?? [],
  [reasonForImport],
  {
    labels: {
      breeding: 'domain.purpose.breeding',
      slaughter: 'domain.purpose.slaughter',
      fattening: 'domain.purpose.fattening',
      other: 'domain.purpose.other'
    }
  }
)

const TRANSPORTER_TYPE_OPTIONS = ['commercial', 'private']

export const transporterTypeDomain = staticEnum(TRANSPORTER_TYPE_OPTIONS, {
  labels: {
    commercial: 'domain.transporterType.commercial',
    private: 'domain.transporterType.private'
  }
})

const YES_NO_OPTIONS = ['yes', 'no']
// Values are message keys resolved via `lib/i18n.js` at render time
// (see `lib/field-widgets.js` and the CYA controller). Same shape as
// COUNTRY_LABELS, SPECIES_LABELS, etc. — every enum label map holds
// keys, not literals. Coverage test in `i18n-coverage.test.js`
// walks the domain manifest and asserts each key resolves.
const YES_NO_LABELS = { yes: 'domain.yesNo.yes', no: 'domain.yesNo.no' }

export const containsUnweanedAnimalsDomain = staticEnum(YES_NO_OPTIONS, {
  labels: YES_NO_LABELS
})

export const regionCodeRequirementDomain = staticEnum(YES_NO_OPTIONS, {
  labels: YES_NO_LABELS
})

// V4: string - max 5, ISO country prefix + region code.
export const regionCodeDomain = predicate(
  'string',
  stringMaxLength(5, regionCode),
  [reasons.stringMaxLength]
)

// V4: enum, MDM-sourced list of Live Animals ports of entry. Fixed
// subset for the spike — full list comes from MDM in production.
const PORT_OF_ENTRY_OPTIONS = [
  'DVR',
  'HUL',
  'LGW',
  'LHR',
  'STN',
  'EDI',
  'BRS',
  'MAN'
]

export const portOfEntryDomain = staticEnum(PORT_OF_ENTRY_OPTIONS, {
  labels: {
    DVR: 'domain.portOfEntry.DVR',
    HUL: 'domain.portOfEntry.HUL',
    LGW: 'domain.portOfEntry.LGW',
    LHR: 'domain.portOfEntry.LHR',
    STN: 'domain.portOfEntry.STN',
    EDI: 'domain.portOfEntry.EDI',
    BRS: 'domain.portOfEntry.BRS',
    MAN: 'domain.portOfEntry.MAN'
  }
})

// V4: multi-select enum. Options depend on the LINE's commodityCode
// (each commodity line has its own set of eligible species). First
// per-line computed-enum in the spike — reads ctx.path to know which
// line's commodityCode to read.
const SPECIES_BY_COMMODITY_CODE = {
  '0101': ['horse'],
  '0102': ['cattle', 'buffalo', 'bison'],
  '0103': ['pig', 'wild-boar'],
  '010410': ['sheep', 'lamb'],
  '010420': ['goat'],
  '01061900': ['dog', 'cat', 'ferret', 'rabbit'],
  '01063100': ['owl', 'falcon', 'eagle', 'other-bird-of-prey'],
  '01064100': ['bee']
}

const SPECIES_LABELS = {
  horse: 'domain.species.horse',
  cattle: 'domain.species.cattle',
  buffalo: 'domain.species.buffalo',
  bison: 'domain.species.bison',
  pig: 'domain.species.pig',
  'wild-boar': 'domain.species.wild-boar',
  sheep: 'domain.species.sheep',
  lamb: 'domain.species.lamb',
  goat: 'domain.species.goat',
  dog: 'domain.species.dog',
  cat: 'domain.species.cat',
  ferret: 'domain.species.ferret',
  rabbit: 'domain.species.rabbit',
  owl: 'domain.species.owl',
  falcon: 'domain.species.falcon',
  eagle: 'domain.species.eagle',
  'other-bird-of-prey': 'domain.species.other-bird-of-prey',
  bee: 'domain.species.bee'
}

export const speciesDomain = computedEnum(
  (fulfilments, _ids, ctx) => {
    // Line-scoped: `ctx.path` is the current commodity line's fulfilmentId.
    // Read the line's commodityCode value and return that code's species.
    const codeMap = fulfilments[commodityCode.id] ?? {}
    const code = ctx?.path ? codeMap[ctx.path] : undefined
    return SPECIES_BY_COMMODITY_CODE[code] ?? []
  },
  [commodityCode],
  { labels: SPECIES_LABELS }
)

const MEANS_OF_TRANSPORT_OPTIONS = [
  'airplane',
  'railway',
  'road-vehicle',
  'vessel'
]

export const meansOfTransportDomain = staticEnum(MEANS_OF_TRANSPORT_OPTIONS, {
  labels: {
    airplane: 'domain.meansOfTransport.airplane',
    railway: 'domain.meansOfTransport.railway',
    'road-vehicle': 'domain.meansOfTransport.road-vehicle',
    vessel: 'domain.meansOfTransport.vessel'
  }
})

// Country list — enough EU + neighbours to demonstrate the > 12 cap on
// transitedCountries and to serve as the country-of-origin picker.
const COUNTRY_OPTIONS = [
  'AT',
  'BE',
  'BG',
  'CH',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'HU',
  'IE',
  'IT',
  'LU',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK'
]

const COUNTRY_LABELS = {
  AT: 'domain.country.AT',
  BE: 'domain.country.BE',
  BG: 'domain.country.BG',
  CH: 'domain.country.CH',
  CZ: 'domain.country.CZ',
  DE: 'domain.country.DE',
  DK: 'domain.country.DK',
  EE: 'domain.country.EE',
  ES: 'domain.country.ES',
  FI: 'domain.country.FI',
  FR: 'domain.country.FR',
  GR: 'domain.country.GR',
  HR: 'domain.country.HR',
  HU: 'domain.country.HU',
  IE: 'domain.country.IE',
  IT: 'domain.country.IT',
  LU: 'domain.country.LU',
  NL: 'domain.country.NL',
  NO: 'domain.country.NO',
  PL: 'domain.country.PL',
  PT: 'domain.country.PT',
  RO: 'domain.country.RO',
  SE: 'domain.country.SE',
  SI: 'domain.country.SI',
  SK: 'domain.country.SK'
}

export const countryOfOriginDomain = staticEnum(COUNTRY_OPTIONS, {
  labels: COUNTRY_LABELS
})

// V4 commodity codes — subset covering the whitelisted gates in
// obligations.js (0102 cattle, 0103 pig, 010410 sheep, 010420 goats,
// 01061900 cats/dogs/ferrets, 0101 horse, 01064100 bees,
// 01063100 birds of prey).
const COMMODITY_OPTIONS = [
  '0101',
  '0102',
  '0103',
  '010410',
  '010420',
  '01061900',
  '01063100',
  '01064100'
]

export const commodityCodeDomain = staticEnum(COMMODITY_OPTIONS, {
  labels: {
    '0101': 'domain.commodityCode.0101',
    '0102': 'domain.commodityCode.0102',
    '0103': 'domain.commodityCode.0103',
    '010410': 'domain.commodityCode.010410',
    '010420': 'domain.commodityCode.010420',
    '01061900': 'domain.commodityCode.01061900',
    '01063100': 'domain.commodityCode.01063100',
    '01064100': 'domain.commodityCode.01064100'
  }
})

// V4: commodity type — MDM enum, small closed list.
// Illustrative values for the spike; real MDM ontology comes from
// production. Small enough (4) to render as radios rather than a select.
const COMMODITY_TYPE_OPTIONS = [
  'meat-producing',
  'dairy-producing',
  'breeding-stock',
  'other'
]

export const commodityTypeDomain = staticEnum(COMMODITY_TYPE_OPTIONS, {
  labels: {
    'meat-producing': 'domain.commodityType.meat-producing',
    'dairy-producing': 'domain.commodityType.dairy-producing',
    'breeding-stock': 'domain.commodityType.breeding-stock',
    other: 'domain.commodityType.other'
  }
})

// ---------------------------------------------------------------------------
// V4 predicates — one per real rule.
// ---------------------------------------------------------------------------

// Free-text trader reference. V4: string - max 58, optional.
export const internalReferenceNumberDomain = predicate(
  'string',
  stringMaxLength(58, internalReferenceNumber),
  [reasons.stringMaxLength]
)

// V4: string - max 58, free-text transport identifier.
export const transportIdentificationDomain = predicate(
  'string',
  stringMaxLength(58, transportIdentification),
  [reasons.stringMaxLength]
)

// V4: string - max 58, free-text transport document reference.
export const transportDocumentReferenceDomain = predicate(
  'string',
  stringMaxLength(58, transportDocumentReference),
  [reasons.stringMaxLength]
)

// V4: string - max 11, CPH.
export const cphDomain = predicate('string', stringMaxLength(11, cph), [
  reasons.stringMaxLength
])

// V4: numeric - max 10 digits, one commodity line's numberOfPackages.
export const numberOfPackagesDomain = predicate(
  'integer',
  (value, ctx) => {
    // Blank passes — numberOfPackages is completion-optional. A blank
    // submission on a Change loop must not error. See NEXT.md
    // resolved-limitation block on optional-only page completion.
    if (value === undefined || value === null || value === '') return []
    if (!Number.isInteger(value) || value < 1) {
      return [
        {
          code: reasons.integerMin.code,
          obligation: numberOfPackages.name,
          path: ctx.path,
          min: 1
        }
      ]
    }
    if (String(value).length > 10) {
      return [
        {
          code: reasons.integerMaxDigits.code,
          obligation: numberOfPackages.name,
          path: ctx.path,
          maxDigits: 10
        }
      ]
    }
    return []
  },
  [reasons.integerMin, reasons.integerMaxDigits]
)

// V4: numeric - one commodity line's animal count. Per-species caps
// come from MDM in production; the values here are illustrative for
// the spike (they let us exercise the cross-field predicate mechanism
// end-to-end). When a line's species is a multi-select, the effective
// cap is the MIN across the selected species — the least-permissive
// species enforces its limit on the whole line.
export const SPECIES_ANIMAL_CAP = {
  horse: 100,
  cattle: 300,
  buffalo: 300,
  bison: 300,
  pig: 500,
  'wild-boar': 500,
  sheep: 800,
  lamb: 800,
  goat: 500,
  dog: 50,
  cat: 50,
  ferret: 50,
  rabbit: 100,
  owl: 20,
  falcon: 20,
  eagle: 20,
  'other-bird-of-prey': 20,
  bee: 1000
}

function speciesCap(selectedSpecies) {
  const caps = (selectedSpecies ?? [])
    .map((s) => SPECIES_ANIMAL_CAP[s])
    .filter((c) => typeof c === 'number')
  if (caps.length === 0) return null
  return Math.min(...caps)
}

export const numberOfAnimalsDomain = predicate(
  'integer',
  (value, ctx) => {
    if (value === undefined || value === null || value === '') return []
    if (!Number.isInteger(value) || value < 1) {
      return [
        {
          code: reasons.integerMin.code,
          obligation: numberOfAnimals.name,
          path: ctx.path,
          min: 1
        }
      ]
    }
    // Per-species cap. `ctx.siblingValue(species)` resolves to the
    // species selection for THIS commodity line (path-scoped) — a
    // different line's species doesn't cross-contaminate. See engine
    // tests §resolves siblings scoped by path.
    const selectedSpecies = ctx.siblingValue(species) ?? []
    const cap = speciesCap(selectedSpecies)
    if (cap !== null && value > cap) {
      return [
        {
          code: reasons.numberOfAnimalsSpeciesCap.code,
          obligation: numberOfAnimals.name,
          path: ctx.path,
          max: cap,
          actual: value
        }
      ]
    }
    return []
  },
  [reasons.integerMin, reasons.numberOfAnimalsSpeciesCap]
)

// V4: address block — organisation name + address line 1 + town +
// postcode as the mandatory core for the spike. Real V4 shape has
// more sub-fields (address line 2, county, country, telephone,
// email); we can extend without touching the widget infrastructure.
// Step 4 iteration 7 wires commercialTransporter as first worked
// example; the remaining depth-1 address blocks reuse this factory.
const ADDRESS_SUB_FIELDS = ['name', 'addressLine1', 'town', 'postcode']

export const commercialTransporterDomain = addressBlock(commercialTransporter, {
  subFields: ADDRESS_SUB_FIELDS,
  required: ADDRESS_SUB_FIELDS
})

export const privateTransporterDomain = addressBlock(privateTransporter, {
  subFields: ADDRESS_SUB_FIELDS,
  required: ADDRESS_SUB_FIELDS
})

export const placeOfOriginDomain = addressBlock(placeOfOrigin, {
  subFields: ADDRESS_SUB_FIELDS,
  required: ADDRESS_SUB_FIELDS
})

export const consignorDomain = addressBlock(consignor, {
  subFields: ADDRESS_SUB_FIELDS,
  required: ADDRESS_SUB_FIELDS
})

export const consigneeDomain = addressBlock(consignee, {
  subFields: ADDRESS_SUB_FIELDS,
  required: ADDRESS_SUB_FIELDS
})

export const importerDomain = addressBlock(importer, {
  subFields: ADDRESS_SUB_FIELDS,
  required: ADDRESS_SUB_FIELDS
})

export const placeOfDestinationDomain = addressBlock(placeOfDestination, {
  subFields: ADDRESS_SUB_FIELDS,
  required: ADDRESS_SUB_FIELDS
})

export const contactAddressDomain = addressBlock(contactAddress, {
  subFields: ADDRESS_SUB_FIELDS,
  required: ADDRESS_SUB_FIELDS
})

// V4: date, DD/MM/YYYY, calendar-valid.
export const arrivalDateAtPortDomain = predicate(
  'date',
  (value, ctx) => {
    if (value === undefined || value === null || value === '') return []
    const parsed = parseDdMmYyyy(value)
    if (!parsed) {
      return [
        {
          code: reasons.dateFormat.code,
          obligation: arrivalDateAtPort.name,
          path: ctx.path
        }
      ]
    }
    return []
  },
  [reasons.dateFormat]
)

// V4: multi-select - max 12 countries.
// The enum options (COUNTRY_OPTIONS) supply legality; the predicate
// enforces the cap. Note: the domain entry needs both option-list
// semantics AND a max-selections predicate; we express this by
// exporting a computedEnum plus a paired predicate. The runtime
// resolves both.
export const transitedCountriesDomain = {
  type: 'enum',
  options: () => COUNTRY_OPTIONS,
  labels: COUNTRY_LABELS,
  predicate: (value, ctx) => {
    if (!Array.isArray(value)) return []
    if (value.length > 12) {
      return [
        {
          code: reasons.arrayMaxSelections.code,
          obligation: transitedCountries.name,
          path: ctx.path,
          max: 12,
          actual: value.length
        }
      ]
    }
    return []
  },
  metadata: {
    shape: 'staticEnumWithMaxSelections',
    options: COUNTRY_OPTIONS,
    labels: COUNTRY_LABELS,
    reasons: [reasons.arrayMaxSelections.code],
    max: 12
  }
}

// Stubbed enum — in production these options come from the certificate.
// For the spike we hardcode four representative values so the browser
// walk works without an upstream integration.
export const ANIMAL_TYPE_OPTIONS = ['bovine', 'ovine', 'porcine', 'equine']
export const ANIMAL_TYPE_LABELS = {
  bovine: 'domain.animalType.bovine',
  ovine: 'domain.animalType.ovine',
  porcine: 'domain.animalType.porcine',
  equine: 'domain.animalType.equine'
}
export const animalsCertifiedForDomain = staticEnum(ANIMAL_TYPE_OPTIONS, {
  labels: ANIMAL_TYPE_LABELS
})

// ---------------------------------------------------------------------------
// Manifest — keyed by obligation id.
// ---------------------------------------------------------------------------

export const domain = new Map([
  [reasonForImport.id, reasonForImportDomain],
  [purposeInInternalMarket.id, purposeInInternalMarketDomain],
  [transporterType.id, transporterTypeDomain],
  [meansOfTransport.id, meansOfTransportDomain],
  [countryOfOrigin.id, countryOfOriginDomain],
  [commodityCode.id, commodityCodeDomain],
  [commodityType.id, commodityTypeDomain],
  [internalReferenceNumber.id, internalReferenceNumberDomain],
  [transportIdentification.id, transportIdentificationDomain],
  [transportDocumentReference.id, transportDocumentReferenceDomain],
  [cph.id, cphDomain],
  [numberOfPackages.id, numberOfPackagesDomain],
  [numberOfAnimals.id, numberOfAnimalsDomain],
  [commercialTransporter.id, commercialTransporterDomain],
  [privateTransporter.id, privateTransporterDomain],
  [placeOfOrigin.id, placeOfOriginDomain],
  [consignor.id, consignorDomain],
  [consignee.id, consigneeDomain],
  [importer.id, importerDomain],
  [placeOfDestination.id, placeOfDestinationDomain],
  [contactAddress.id, contactAddressDomain],
  [arrivalDateAtPort.id, arrivalDateAtPortDomain],
  [transitedCountries.id, transitedCountriesDomain],
  [animalsCertifiedFor.id, animalsCertifiedForDomain],
  [containsUnweanedAnimals.id, containsUnweanedAnimalsDomain],
  [regionCodeRequirement.id, regionCodeRequirementDomain],
  [regionCode.id, regionCodeDomain],
  [portOfEntry.id, portOfEntryDomain],
  [species.id, speciesDomain]
])
