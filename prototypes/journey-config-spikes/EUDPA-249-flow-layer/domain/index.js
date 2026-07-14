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
  contactAddress,
  permanentAddress,
  passport,
  tattoo,
  earTag,
  horseName,
  identificationDetails,
  description,
  accompanyingDocumentType,
  accompanyingDocumentAttachmentType,
  accompanyingDocumentReference,
  accompanyingDocumentDateOfIssue
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
  addressSubFieldRequired: {
    code: 'domain.address.subFieldRequired',
    explanation: 'a required sub-field of the address is missing or blank'
  },
  // Step 5e — per-sub-field V4 rules expressed as their own reason
  // codes so the error summary maps them to distinct messages.
  addressSubFieldMaxLength: {
    code: 'domain.address.subFieldMaxLength',
    explanation:
      'a sub-field of the address exceeds its per-V4-field maximum length'
  },
  addressSubFieldEmailFormat: {
    code: 'domain.address.subFieldEmailFormat',
    explanation:
      'a sub-field of the address expected an email format (must contain @)'
  },
  addressSubFieldEnumInvalid: {
    code: 'domain.address.subFieldEnumInvalid',
    explanation:
      'a sub-field of the address expected a value from the MDM enum list'
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
// name; the widget renders one govukInput / govukSelect per subField,
// the payload gatherer collects `${id}__${subField}` fields into that
// object. Per-sub-field rules come from `subFieldRules` (map keyed by
// sub-field name) — that carries maxLength / type / options so the
// predicate can enforce V4 field-level rules (max-length caps, email
// format, MDM country enum). Fires distinct reason codes per rule so
// the error summary can surface the right message per field:
//
//   - addressSubFieldMaxLength — value exceeds V4 max
//   - addressSubFieldEmailFormat — email sub-field must contain @
//   - addressSubFieldEnumInvalid — country not in MDM list
//
// V4-spec compliance note (interpretation A of the Standard Address
// Block validation table): "The validation below applies once the
// address record is provided." Concretely: the predicate validates
// ONLY user-supplied sub-fields (max-length, email format, enum
// membership). Blank sub-fields do NOT fire required errors at page
// save — completeness is checked by `isComplete(value)` and surfaced
// at CYA time via a "Complete the … address" prompt. Whether the
// user can save the page at all with a fully blank address is
// governed by the parent obligation's `mandatoryToProceed` flag on
// the flow presents entry.
//
// Step 5e widened the shape from 4 all-mandatory string fields to the
// V4 standard address block (9 fields — 6 required, 3 optional, mixed
// max-lengths). `commercialTransporter` carries an extra
// `transporterAuthorisationNumber` sub-field beyond the base set.
export function addressBlock(
  obligation,
  { subFields, required, subFieldRules = {} } = {}
) {
  const isComplete = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false
    }
    for (const sub of required ?? []) {
      const leaf = value[sub]
      if (typeof leaf !== 'string' || leaf.trim() === '') return false
    }
    return true
  }
  return {
    type: 'address',
    subFields,
    required,
    subFieldRules,
    isComplete,
    predicate: (value, ctx) => {
      if (value === undefined || value === null) return []
      if (typeof value !== 'object' || Array.isArray(value)) return []
      const errors = []
      for (const sub of subFields ?? []) {
        const leaf = value[sub]
        // Interpretation A: skip validation of blank sub-fields.
        // Required rules don't fire at page save; they surface as
        // completeness prompts on CYA via `isComplete(value)`.
        if (leaf === undefined || leaf === null || leaf === '') continue
        const rule = subFieldRules[sub]
        if (!rule) continue
        // Max-length check applies to every rule that carries one.
        if (
          typeof rule.maxLength === 'number' &&
          typeof leaf === 'string' &&
          leaf.length > rule.maxLength
        ) {
          errors.push({
            code: reasons.addressSubFieldMaxLength.code,
            obligation: obligation.name,
            path: ctx.path,
            subField: sub,
            max: rule.maxLength,
            actual: leaf.length
          })
        }
        // Email format — cheapest useful check for the spike.
        if (rule.type === 'email' && !String(leaf).includes('@')) {
          errors.push({
            code: reasons.addressSubFieldEmailFormat.code,
            obligation: obligation.name,
            path: ctx.path,
            subField: sub
          })
        }
        // MDM country enum — sub-field value must be one of the
        // rule's options.
        if (rule.type === 'enum' && Array.isArray(rule.options)) {
          if (!rule.options.includes(leaf)) {
            errors.push({
              code: reasons.addressSubFieldEnumInvalid.code,
              obligation: obligation.name,
              path: ctx.path,
              subField: sub,
              invalid: leaf
            })
          }
        }
      }
      return errors
    },
    metadata: {
      shape: 'addressBlock',
      subFields,
      required,
      subFieldRules,
      reasons: [
        reasons.addressSubFieldMaxLength.code,
        reasons.addressSubFieldEmailFormat.code,
        reasons.addressSubFieldEnumInvalid.code
      ]
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

// V4 spec (Confluence page 6497338582): 5 values. Step 5c aligned this
// with the spec (was 4 values with mismatched codes — transit-through-eu
// vs V4's `transit`, temporary-admission vs V4's `temporary-admission-
// horses`, re-entry-after-refusal vs V4's `re-entry`; V4 also carries
// `transhipment-or-onward-travel` which the iteration-shipped stub
// lacked). Codes are kebab-cased for consistency across the manifest.
const REASON_FOR_IMPORT_OPTIONS = [
  'internal-market',
  'transhipment-or-onward-travel',
  'transit',
  're-entry',
  'temporary-admission-horses'
]

export const reasonForImportDomain = staticEnum(REASON_FOR_IMPORT_OPTIONS, {
  labels: {
    'internal-market': 'domain.reasonForImport.internal-market',
    'transhipment-or-onward-travel':
      'domain.reasonForImport.transhipment-or-onward-travel',
    transit: 'domain.reasonForImport.transit',
    're-entry': 'domain.reasonForImport.re-entry',
    'temporary-admission-horses':
      'domain.reasonForImport.temporary-admission-horses'
  }
})

// V4 spec: purpose has 11 values, all available under the
// `internal-market` reason. Step 5c widened from the initial 4-value
// stub (`breeding / slaughter / fattening / other` — `other` doesn't
// exist in V4).
const PURPOSE_BY_REASON = {
  'internal-market': [
    'transfer-of-ownership-sale-or-gift',
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
  ]
}

export const purposeInInternalMarketDomain = computedEnum(
  (fulfilments) => PURPOSE_BY_REASON[fulfilments[reasonForImport.id]] ?? [],
  [reasonForImport],
  {
    labels: {
      'transfer-of-ownership-sale-or-gift':
        'domain.purpose.transfer-of-ownership-sale-or-gift',
      'transfer-of-ownership-rescue':
        'domain.purpose.transfer-of-ownership-rescue',
      breeding: 'domain.purpose.breeding',
      research: 'domain.purpose.research',
      'racing-competition-show-or-training':
        'domain.purpose.racing-competition-show-or-training',
      'approved-premises-or-body': 'domain.purpose.approved-premises-or-body',
      'companion-animal-not-for-resale-or-rehoming':
        'domain.purpose.companion-animal-not-for-resale-or-rehoming',
      production: 'domain.purpose.production',
      slaughter: 'domain.purpose.slaughter',
      fattening: 'domain.purpose.fattening',
      restocking: 'domain.purpose.restocking'
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

// Country list — used for address `country` sub-fields (any country
// might legitimately appear on an address block: destination + contact
// addresses are commonly within GB). GB is included here for that
// reason. Also feeds `transitedCountries` (enough entries to
// demonstrate the > 12 cap).
//
// Audit #5: `countryOfOrigin` is a DIFFERENT enum — the V4 spec says
// "Restricted to countries in the named MDM list for EU, EEA and EFTA
// countries" (Confluence page 6497338582). GB is neither, so the
// countryOfOrigin picker uses `EEA_EFTA_COUNTRY_OPTIONS` below (the
// same set minus GB). Address blocks keep the general list.
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
  'GB',
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

// V4 audit #5: countryOfOrigin restricts to EU / EEA / EFTA. GB is
// neither EU (post-Brexit), nor EEA (never joined), nor EFTA (never
// joined) so it's removed here. The full MDM list from V4 is the
// production source; this stub covers the same countries as
// COUNTRY_OPTIONS minus GB — enough to demonstrate the widget and
// let the walks pick France (FR) as the country of origin.
const EEA_EFTA_COUNTRY_OPTIONS = COUNTRY_OPTIONS.filter((c) => c !== 'GB')

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
  GB: 'domain.country.GB',
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

export const countryOfOriginDomain = staticEnum(EEA_EFTA_COUNTRY_OPTIONS, {
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

// V4: accompanying document type — fixed enum of the 14 document
// kinds listed in the spec (Confluence page 6497338582).
const ACCOMPANYING_DOCUMENT_TYPE_OPTIONS = [
  'itahc',
  'veterinary-health-certificate',
  'air-waybill',
  'import-permit',
  'letter-of-authority',
  'commercial-invoice',
  'sea-waybill',
  'rail-waybill',
  'bill-of-lading',
  'catch-certificate',
  'laboratory-sampling-results',
  'health-certificate',
  'journey-log',
  'other'
]

export const accompanyingDocumentTypeDomain = staticEnum(
  ACCOMPANYING_DOCUMENT_TYPE_OPTIONS,
  {
    labels: {
      itahc: 'domain.accompanyingDocumentType.itahc',
      'veterinary-health-certificate':
        'domain.accompanyingDocumentType.veterinary-health-certificate',
      'air-waybill': 'domain.accompanyingDocumentType.air-waybill',
      'import-permit': 'domain.accompanyingDocumentType.import-permit',
      'letter-of-authority':
        'domain.accompanyingDocumentType.letter-of-authority',
      'commercial-invoice':
        'domain.accompanyingDocumentType.commercial-invoice',
      'sea-waybill': 'domain.accompanyingDocumentType.sea-waybill',
      'rail-waybill': 'domain.accompanyingDocumentType.rail-waybill',
      'bill-of-lading': 'domain.accompanyingDocumentType.bill-of-lading',
      'catch-certificate': 'domain.accompanyingDocumentType.catch-certificate',
      'laboratory-sampling-results':
        'domain.accompanyingDocumentType.laboratory-sampling-results',
      'health-certificate':
        'domain.accompanyingDocumentType.health-certificate',
      'journey-log': 'domain.accompanyingDocumentType.journey-log',
      other: 'domain.accompanyingDocumentType.other'
    }
  }
)

// V4: attachment format — the file format the accompanying document
// is supplied in. Fixed list of 8 file extensions per spec.
const ACCOMPANYING_DOCUMENT_ATTACHMENT_TYPE_OPTIONS = [
  'pdf',
  'doc',
  'docx',
  'jpg',
  'jpeg',
  'png',
  'xls',
  'xlsx'
]

export const accompanyingDocumentAttachmentTypeDomain = staticEnum(
  ACCOMPANYING_DOCUMENT_ATTACHMENT_TYPE_OPTIONS,
  {
    labels: {
      pdf: 'domain.accompanyingDocumentAttachmentType.pdf',
      doc: 'domain.accompanyingDocumentAttachmentType.doc',
      docx: 'domain.accompanyingDocumentAttachmentType.docx',
      jpg: 'domain.accompanyingDocumentAttachmentType.jpg',
      jpeg: 'domain.accompanyingDocumentAttachmentType.jpeg',
      png: 'domain.accompanyingDocumentAttachmentType.png',
      xls: 'domain.accompanyingDocumentAttachmentType.xls',
      xlsx: 'domain.accompanyingDocumentAttachmentType.xlsx'
    }
  }
)

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

// V4: numeric - one commodity line's animal count. The spec (Confluence
// page 6497338582) says "whole number, max 9,223,372,036,854,775,807"
// — Long.MAX_VALUE, i.e. no per-species cap. A prior version of this
// spike carried a fabricated `SPECIES_ANIMAL_CAP` map with illustrative
// per-species limits to exercise the cross-field predicate mechanism;
// that map has been removed because it caused the spike to reject
// spec-valid values (e.g. `5000` on a horse line under the old
// horse=100 cap). The cross-field predicate machinery is still
// exercised by other domain entries (e.g. `regionCode` reading
// `regionCodeRequirement`, `species` computed enum reading
// `commodityCode`), so removing this specific instance costs no
// coverage. See NEXT.md audit finding #4.
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
    return []
  },
  [reasons.integerMin]
)

// V4 standard address block — 9 sub-fields per Confluence page
// 6497338582. Step 5e widened this from the 4-mandatory-string stub
// (name / addressLine1 / town / postcode) to the full spec: 6
// mandatory, 3 optional, mixed max-lengths, country as an MDM enum,
// telephone + email with their own semantics.
//
//   Sub-field     | Type       | Max | M/O |
//   --------------+------------+-----+-----+
//   name          | string     | 255 |  M  | Name or Organisation name
//   addressLine1  | string     | 255 |  M  |
//   addressLine2  | string     | 255 |  O  |
//   town          | string     | 100 |  M  | Town or city
//   county        | string     | 100 |  O  |
//   postcode      | string     |  12 |  M  |
//   country       | enum (MDM) |  —  |  M  | Reuses COUNTRY_OPTIONS
//   telephone     | telephone  |  20 |  M  |
//   email         | email      | 254 |  M  |
//
// commercialTransporter carries an extra `transporterAuthorisationNumber`
// (string max 255, mandatory) inserted after `addressLine1`.
// V4 spec: "only displayed when a user manually creates a commercial
// transporter from NI" — the spike shows it unconditionally.
const ADDRESS_SUB_FIELDS = [
  'name',
  'addressLine1',
  'addressLine2',
  'town',
  'county',
  'postcode',
  'country',
  'telephone',
  'email'
]

const ADDRESS_REQUIRED_SUB_FIELDS = [
  'name',
  'addressLine1',
  'town',
  'postcode',
  'country',
  'telephone',
  'email'
]

const ADDRESS_SUB_FIELD_RULES = {
  name: { type: 'string', maxLength: 255 },
  addressLine1: { type: 'string', maxLength: 255 },
  addressLine2: { type: 'string', maxLength: 255 },
  town: { type: 'string', maxLength: 100 },
  county: { type: 'string', maxLength: 100 },
  postcode: { type: 'string', maxLength: 12 },
  country: { type: 'enum', options: COUNTRY_OPTIONS, labels: COUNTRY_LABELS },
  telephone: { type: 'telephone', maxLength: 20 },
  email: { type: 'email', maxLength: 254 }
}

// commercialTransporter — insert transporterAuthorisationNumber after
// addressLine1 in the render order. Mandatory sub-field per V4 spec
// when a user manually creates the transporter (NI). The rule map
// clones the base + adds one entry.
const COMMERCIAL_TRANSPORTER_SUB_FIELDS = [
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
]

const COMMERCIAL_TRANSPORTER_REQUIRED = [
  'name',
  'transporterAuthorisationNumber',
  'addressLine1',
  'town',
  'postcode',
  'country',
  'telephone',
  'email'
]

const COMMERCIAL_TRANSPORTER_SUB_FIELD_RULES = {
  ...ADDRESS_SUB_FIELD_RULES,
  transporterAuthorisationNumber: { type: 'string', maxLength: 255 }
}

export const commercialTransporterDomain = addressBlock(commercialTransporter, {
  subFields: COMMERCIAL_TRANSPORTER_SUB_FIELDS,
  required: COMMERCIAL_TRANSPORTER_REQUIRED,
  subFieldRules: COMMERCIAL_TRANSPORTER_SUB_FIELD_RULES
})

export const privateTransporterDomain = addressBlock(privateTransporter, {
  subFields: ADDRESS_SUB_FIELDS,
  required: ADDRESS_REQUIRED_SUB_FIELDS,
  subFieldRules: ADDRESS_SUB_FIELD_RULES
})

export const placeOfOriginDomain = addressBlock(placeOfOrigin, {
  subFields: ADDRESS_SUB_FIELDS,
  required: ADDRESS_REQUIRED_SUB_FIELDS,
  subFieldRules: ADDRESS_SUB_FIELD_RULES
})

export const consignorDomain = addressBlock(consignor, {
  subFields: ADDRESS_SUB_FIELDS,
  required: ADDRESS_REQUIRED_SUB_FIELDS,
  subFieldRules: ADDRESS_SUB_FIELD_RULES
})

export const consigneeDomain = addressBlock(consignee, {
  subFields: ADDRESS_SUB_FIELDS,
  required: ADDRESS_REQUIRED_SUB_FIELDS,
  subFieldRules: ADDRESS_SUB_FIELD_RULES
})

export const importerDomain = addressBlock(importer, {
  subFields: ADDRESS_SUB_FIELDS,
  required: ADDRESS_REQUIRED_SUB_FIELDS,
  subFieldRules: ADDRESS_SUB_FIELD_RULES
})

export const placeOfDestinationDomain = addressBlock(placeOfDestination, {
  subFields: ADDRESS_SUB_FIELDS,
  required: ADDRESS_REQUIRED_SUB_FIELDS,
  subFieldRules: ADDRESS_SUB_FIELD_RULES
})

export const contactAddressDomain = addressBlock(contactAddress, {
  subFields: ADDRESS_SUB_FIELDS,
  required: ADDRESS_REQUIRED_SUB_FIELDS,
  subFieldRules: ADDRESS_SUB_FIELD_RULES
})

// V4: permanent address for a per-animal unit — the ONLY mandatory
// unit-scoped obligation in the manifest. Allow-listed to commodity
// code 01061900 (Cats / Dogs / Ferrets); other commodities have no
// permanent-address requirement. Same subField shape as the depth-1
// address blocks. First depth-2 obligation wired end-to-end (iter 9
// phase C). See docs/add-an-obligation.md iteration 9.
export const permanentAddressDomain = addressBlock(permanentAddress, {
  subFields: ADDRESS_SUB_FIELDS,
  required: ADDRESS_REQUIRED_SUB_FIELDS,
  subFieldRules: ADDRESS_SUB_FIELD_RULES
})

// V4 per-unit identifier obligations — wired in iteration 10 on top of
// the depth-2 infrastructure iteration 9 laid down. All optional
// (completion-mandate). String rules; V4 spec (Confluence page
// 6497338582) pins each to `string - max 58`. Iteration 10 shipped
// with conservative defaults (40 for structured ids, 100 for
// free-text) as placeholders; step 5a tightens them to the spec.

// V4: passport number for a per-animal unit. Allow-listed to horses
// (0101), cattle (0102), cats/dogs/ferrets (01061900). `string - max
// 58` per V4.
export const passportDomain = predicate(
  'string',
  stringMaxLength(58, passport),
  [reasons.stringMaxLength]
)

// V4: tattoo identifier. Allow-listed to cats/dogs/ferrets
// (01061900), pigs (0103), cattle (0102). `string - max 58` per V4.
export const tattooDomain = predicate('string', stringMaxLength(58, tattoo), [
  reasons.stringMaxLength
])

// V4: ear-tag identifier. Allow-listed to cattle (0102), pigs (0103),
// sheep (010410), goats (010420). `string - max 58` per V4.
export const earTagDomain = predicate('string', stringMaxLength(58, earTag), [
  reasons.stringMaxLength
])

// V4: horse name. Allow-listed to horses (0101) only. `string - max
// 58` per V4.
export const horseNameDomain = predicate(
  'string',
  stringMaxLength(58, horseName),
  [reasons.stringMaxLength]
)

// V4: free-text identification details — fallback for commodity codes
// with NO specific identifier (allowListedByPredicate inverse gate).
// First wired obligation using that gate; see obligations/helpers.js
// where `predicate` is now exposed on the metadata so browser-side
// helpers can evaluate the gate without executing the applyTo
// closure. `string - max 58` per V4.
export const identificationDetailsDomain = predicate(
  'string',
  stringMaxLength(58, identificationDetails),
  [reasons.stringMaxLength]
)

// V4: free-text description — same inverse gate as
// identificationDetails. `string - max 58` per V4.
export const descriptionDomain = predicate(
  'string',
  stringMaxLength(58, description),
  [reasons.stringMaxLength]
)

// V4: accompanying document reference — free-text, max 58 per spec
// (Confluence page 6497338582). Blank passes so an all-optional
// submission on the accompanying-documents page doesn't error before
// the branchedGate flips the block to mandatory (see obligations.js
// accompanyingDocumentBlockApplyTo).
export const accompanyingDocumentReferenceDomain = predicate(
  'string',
  stringMaxLength(58, accompanyingDocumentReference),
  [reasons.stringMaxLength]
)

// V4: accompanying document date of issue — DD/MM/YYYY, calendar-valid.
// Same shape as arrivalDateAtPortDomain; blank passes.
export const accompanyingDocumentDateOfIssueDomain = predicate(
  'date',
  (value, ctx) => {
    if (value === undefined || value === null || value === '') return []
    const parsed = parseDdMmYyyy(value)
    if (!parsed) {
      return [
        {
          code: reasons.dateFormat.code,
          obligation: accompanyingDocumentDateOfIssue.name,
          path: ctx.path
        }
      ]
    }
    return []
  },
  [reasons.dateFormat]
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

// V4 spec (Confluence page 6497338582): the 16 PURPOSES an animal
// can be certified for. Step 5d replaced the earlier stub which used
// 4 SPECIES codes (bovine / ovine / porcine / equine) — that was a
// semantic mismatch: this obligation asks "what has this animal been
// certified for?", not "what species is it?".
//
// In production these values come from the certificate. For the
// browsable prototype we hardcode the V4 canonical list so CYA and the
// task list read the right way.
export const ANIMALS_CERTIFIED_FOR_OPTIONS = [
  'further-keeping',
  'slaughter',
  'confined-establishment',
  'germinal-products',
  'registered-equine-animal',
  'travelling-circus-or-animal-act',
  'exhibition',
  'event-or-activity-near-borders',
  'release-into-the-wild',
  'dispatch-centre',
  'relaying-area-or-purification-centre',
  'ornamental-aquaculture-establishment',
  'technical-use',
  'quarantine-or-similar-establishment',
  'live-aquatic-animals-for-human-consumption',
  'other'
]
export const ANIMALS_CERTIFIED_FOR_LABELS = Object.fromEntries(
  ANIMALS_CERTIFIED_FOR_OPTIONS.map((code) => [
    code,
    `domain.animalsCertifiedFor.${code}`
  ])
)
export const animalsCertifiedForDomain = staticEnum(
  ANIMALS_CERTIFIED_FOR_OPTIONS,
  { labels: ANIMALS_CERTIFIED_FOR_LABELS }
)

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
  [permanentAddress.id, permanentAddressDomain],
  [passport.id, passportDomain],
  [tattoo.id, tattooDomain],
  [earTag.id, earTagDomain],
  [horseName.id, horseNameDomain],
  [identificationDetails.id, identificationDetailsDomain],
  [description.id, descriptionDomain],
  [arrivalDateAtPort.id, arrivalDateAtPortDomain],
  [transitedCountries.id, transitedCountriesDomain],
  [animalsCertifiedFor.id, animalsCertifiedForDomain],
  [containsUnweanedAnimals.id, containsUnweanedAnimalsDomain],
  [regionCodeRequirement.id, regionCodeRequirementDomain],
  [regionCode.id, regionCodeDomain],
  [portOfEntry.id, portOfEntryDomain],
  [species.id, speciesDomain],
  [accompanyingDocumentType.id, accompanyingDocumentTypeDomain],
  [
    accompanyingDocumentAttachmentType.id,
    accompanyingDocumentAttachmentTypeDomain
  ],
  [accompanyingDocumentReference.id, accompanyingDocumentReferenceDomain],
  [accompanyingDocumentDateOfIssue.id, accompanyingDocumentDateOfIssueDomain]
])
