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
 *   { type: 'enum',    options: (fulfilments, ctx?) → string[] }
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

// EUDPA-288 inc-007c — MDM option source (PLAN §5.4 ruling: "use the most
// realistic source ... we have the MDM integrations, use them"). The model
// imports A's reference-data services and delegates every MDM-backed enum's
// `options` to the SAME accessor A's own controllers call, returning codes
// only (no display copy — the no-display-keys gate enforces that). This
// deliberately opens B's closed import set — the intended MDM trade, not a
// regression; obligation-purity.js already sanctions the services/ route.
//
// Field ↔ service delegation map (delegated-live):
//   reasonForImport                    → import-reason-purpose.reasons()
//   purposeInInternalMarket            → import-reason-purpose.purposes() (reason-gated)
//   countryOfOrigin                    → countries.originCountries()
//   transitedCountries                 → countries.originCountries()
//   portOfEntry                        → ports.list()
//   meansOfTransport                   → transport-reference.meansOfTransport()
//   transporterType                    → transport-reference.transporterTypes()
//   commodityCode                      → commodities.list()
//   species                            → commodities.speciesFor(line's commodity)
//   animalsCertifiedFor                → certification-purposes.certificationPurposes()
//   accompanyingDocumentType           → document-types.documentTypes()
//   accompanyingDocumentAttachmentType → document-types.attachmentTypes()
// Left static (no MDM source): containsUnweanedAnimals, regionCodeRequirement
//   (yes/no), commodityType (system-populated placeholder — no service for it).
// Address-block country sub-field validation is out of scope (not a top-level
// enum entry; rendered from countries.addressCountries()).
import * as countries from '../../services/countries/index.js'
import * as ports from '../../services/ports/index.js'
import * as commodities from '../../services/commodities/index.js'
import * as documentTypes from '../../services/document-types/index.js'
import * as certification from '../../services/certification-purposes/index.js'
import * as importReasonPurpose from '../../services/import-reason-purpose/index.js'
import * as transportReference from '../../services/transport-reference/index.js'

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
// Each attaches `.metadata` for introspection.
// ---------------------------------------------------------------------------

// Static enum — options do not depend on state.
export function staticEnum(options) {
  return {
    type: 'enum',
    options: () => options,
    metadata: { shape: 'staticEnum', options }
  }
}

// Computed enum — options depend on state via a pure function.
// `readsFrom` (metadata-only) names the sibling obligations the closure
// reads; the data-dictionary sketch uses it for a static-reachability
// view without running the closure.
export function computedEnum(fn, readsFrom = []) {
  return {
    type: 'enum',
    options: fn,
    metadata: {
      shape: 'computedEnum',
      readsFrom: readsFrom.map((o) => o.name)
    }
  }
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

// MDM: import-reason-purpose service. Codes are A's stored vocabulary
// (camelCase: 'internalMarket', ...), NOT B's kebab. inc-007c trade.
export const reasonForImportDomain = computedEnum(() =>
  importReasonPurpose.reasons().map((option) => option.value)
)

// MDM: import-reason-purpose service, reason-gated (B's model semantics
// preserved — readsFrom reasonForImport). The gate value is A's
// 'internalMarket' code now that reasonForImport sources from A's MDM.
export const purposeInInternalMarketDomain = computedEnum(
  (fulfilments) =>
    fulfilments[reasonForImport.id] === 'internalMarket'
      ? importReasonPurpose.purposes().map((option) => option.value)
      : [],
  [reasonForImport]
)

// MDM: transport-reference service.
export const transporterTypeDomain = computedEnum(() =>
  transportReference.transporterTypes()
)

const YES_NO_OPTIONS = ['yes', 'no']

export const containsUnweanedAnimalsDomain = staticEnum(YES_NO_OPTIONS)

export const regionCodeRequirementDomain = staticEnum(YES_NO_OPTIONS)

// V4: string - max 5, ISO country prefix + region code.
export const regionCodeDomain = predicate(
  'string',
  stringMaxLength(5, regionCode),
  [reasons.stringMaxLength]
)

// MDM: ports service. Option value is A's port code (e.g. 'GB DVR').
export const portOfEntryDomain = computedEnum(() =>
  ports.list().map((port) => port.code)
)

// MDM: commodities service, per-line. `ctx.path` is the current commodity
// line's fulfilmentId; the line's stored commodityCode is A's commodity
// NAME (commodityCode now sources from commodities.list()), which is the
// key commodities.speciesFor expects. Values are A's taxonomy ids.
export const speciesDomain = computedEnum(
  (fulfilments, _ids, ctx) => {
    const codeMap = fulfilments[commodityCode.id] ?? {}
    const name = ctx?.path ? codeMap[ctx.path] : undefined
    return commodities.speciesFor(name).map((option) => option.value)
  },
  [commodityCode]
)

// MDM: transport-reference service.
export const meansOfTransportDomain = computedEnum(() =>
  transportReference.meansOfTransport()
)

// Country list for address `country` sub-field validation (any country
// might legitimately appear on an address block; GB is included for
// destination/contact addresses). Address blocks are out of inc-007c's
// MDM scope — this static list stays. The enum entries (countryOfOrigin,
// transitedCountries) now source their options from the countries service.
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

// MDM: countries service. `originCountries()` is A's EEA/EFTA list (ISO
// codes, GB-excluded) — the same accessor features/origin uses.
export const countryOfOriginDomain = computedEnum(() =>
  countries.originCountries().map((option) => option.value)
)

// MDM: commodities service. Option value is A's commodity NAME ('Cow',
// 'Horse', ...) — A's picker vocabulary, NOT the CN code. B's gates still
// compare codes; the name↔code normalisation is the bridge/oracle's job
// (inc-008/010, PLAN §5.6, COMMODITY_CODES, A→B only as it is non-injective).
export const commodityCodeDomain = computedEnum(() => commodities.list())

// V4: commodity type — MDM enum, small closed list. The real value
// set comes from an MDM ontology that isn't documented on the V4
// Confluence page (audit #12 — spec clarifications needed). The
// spec's only concrete example is "Game", so we ship that one real
// value plus two OBVIOUS PLACEHOLDERS that scream "not real" during
// any demo. Previously the stubs (meat-producing / dairy-producing /
// breeding-stock / other) looked plausible enough to slip past a
// reviewer — the audit found we'd stopped questioning them. Making
// the placeholders visible protects against that regression.
const COMMODITY_TYPE_OPTIONS = ['game', 'placeholder-1', 'placeholder-2']

export const commodityTypeDomain = staticEnum(COMMODITY_TYPE_OPTIONS)

// MDM: document-types service. Option values are A's document-type and
// attachment-format labels (A's select stores the display string as the
// value — there is no code/label split in A's source).
export const accompanyingDocumentTypeDomain = computedEnum(() =>
  documentTypes.documentTypes()
)

export const accompanyingDocumentAttachmentTypeDomain = computedEnum(() =>
  documentTypes.attachmentTypes()
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
  country: { type: 'enum', options: COUNTRY_OPTIONS },
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
  // MDM: countries service (same accessor transit-countries.controller uses).
  options: () => countries.originCountries().map((option) => option.value),
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
    shape: 'computedEnumWithMaxSelections',
    readsFrom: [],
    reasons: [reasons.arrayMaxSelections.code],
    max: 12
  }
}

// MDM: certification-purposes service. Option values are A's
// certified-for purpose codes.
export const animalsCertifiedForDomain = computedEnum(() =>
  certification.certificationPurposes().map((option) => option.value)
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
