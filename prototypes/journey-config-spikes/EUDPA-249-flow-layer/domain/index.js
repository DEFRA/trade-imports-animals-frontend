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
 * `applyTo`: read from `fulfilments` (which may include external-lookup
 * results delivered via `lookup-result` obligations — see
 * `certifiedForOptionsLookup` below).
 *
 * Entry shapes:
 *   { type: 'enum',    options: (fulfilments, ctx?) → string[], labels? }
 *   { type: 'integer', predicate: (value, ctx) → error[], reasons: [...] }
 *   { type: 'string',  predicate: (value, ctx) → error[], reasons: [...] }
 *   { type: 'date',    predicate: (value, ctx) → error[], reasons: [...] }
 *
 * Helper factories (`staticEnum`, `computedEnum`, `predicate`,
 * `lookupEnum`) attach a `.metadata` sidecar mirroring the obligations
 * `helpers.js` pattern — the data-dictionary sketch introspects it.
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
  numberOfPackages,
  cph
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

// Lookup-driven enum — options come from a `lookup-result` obligation's
// fulfilment. The orchestrator resolves the lookup and writes the
// result; here we just read it.
export function lookupEnum(lookupObligation, { labels } = {}) {
  const entry = {
    type: 'enum',
    options: (fulfilments) => fulfilments[lookupObligation.id] ?? []
  }
  entry.labels = labels ?? {}
  entry.metadata = {
    shape: 'lookupEnum',
    lookupObligation: lookupObligation.name,
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

// ---------------------------------------------------------------------------
// Lookup-result obligation — defined here rather than in the parent
// obligations manifest because it's a spike-specific illustration of the
// async-options pattern. In production it would sit alongside the other
// obligations. The evaluator treats it as an ordinary `single` category;
// the orchestrator fulfils it by writing the fetched options into
// `fulfilments`.
// ---------------------------------------------------------------------------

export const certifiedForOptionsLookup = {
  id: 'lookup-a1b2c3d4-0000-4000-8000-certifiedforopts',
  name: 'certifiedForOptionsLookup',
  applyTo: () => ({ inScope: true, status: 'system-handled' })
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
    'internal-market': 'Internal market',
    'transit-through-eu': 'Transit through the EU',
    'temporary-admission': 'Temporary admission',
    're-entry-after-refusal': 'Re-entry after refusal'
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
      breeding: 'Breeding',
      slaughter: 'Slaughter',
      fattening: 'Fattening',
      other: 'Other'
    }
  }
)

const TRANSPORTER_TYPE_OPTIONS = ['commercial', 'private']

export const transporterTypeDomain = staticEnum(TRANSPORTER_TYPE_OPTIONS, {
  labels: {
    commercial: 'Commercial transporter',
    private: 'Private transporter'
  }
})

const MEANS_OF_TRANSPORT_OPTIONS = [
  'airplane',
  'railway',
  'road-vehicle',
  'vessel'
]

export const meansOfTransportDomain = staticEnum(MEANS_OF_TRANSPORT_OPTIONS, {
  labels: {
    airplane: 'Airplane',
    railway: 'Railway',
    'road-vehicle': 'Road vehicle',
    vessel: 'Vessel'
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
  AT: 'Austria',
  BE: 'Belgium',
  BG: 'Bulgaria',
  CH: 'Switzerland',
  CZ: 'Czech Republic',
  DE: 'Germany',
  DK: 'Denmark',
  EE: 'Estonia',
  ES: 'Spain',
  FI: 'Finland',
  FR: 'France',
  GR: 'Greece',
  HR: 'Croatia',
  HU: 'Hungary',
  IE: 'Ireland',
  IT: 'Italy',
  LU: 'Luxembourg',
  NL: 'Netherlands',
  NO: 'Norway',
  PL: 'Poland',
  PT: 'Portugal',
  RO: 'Romania',
  SE: 'Sweden',
  SI: 'Slovenia',
  SK: 'Slovakia'
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
    '0101': 'Horse (0101)',
    '0102': 'Cattle (0102)',
    '0103': 'Pig (0103)',
    '010410': 'Sheep (010410)',
    '010420': 'Goats (010420)',
    '01061900': 'Cats, Dogs or Ferrets (01061900)',
    '01063100': 'Birds of prey (01063100)',
    '01064100': 'Bees (01064100)'
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

// Lookup-driven — animalsCertifiedFor options fetched by the
// orchestrator and written to `certifiedForOptionsLookup`.
export const animalsCertifiedForDomain = lookupEnum(certifiedForOptionsLookup)

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
  [internalReferenceNumber.id, internalReferenceNumberDomain],
  [transportIdentification.id, transportIdentificationDomain],
  [transportDocumentReference.id, transportDocumentReferenceDomain],
  [cph.id, cphDomain],
  [numberOfPackages.id, numberOfPackagesDomain],
  [arrivalDateAtPort.id, arrivalDateAtPortDomain],
  [transitedCountries.id, transitedCountriesDomain],
  [animalsCertifiedFor.id, animalsCertifiedForDomain]
])
