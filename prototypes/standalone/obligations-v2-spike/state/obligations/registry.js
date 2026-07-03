import { T } from './types.js'

/**
 * THE obligation catalogue — plain-JS data (the v2 inversion of v1's
 * UUID-keyed JSON). Each def carries only nouns and constraint values:
 * `type`, `cardinality`, `options` (value-domains, NOT labels), `required`
 * / `saveBlocking` (mandate facts), `system`, `renderOnly`, and the
 * relationship literals `activatedBy` / `wipeOnExit`. There is NO copy,
 * NO widget choice, NO message text and NO closure here — those live in
 * per-page controllers/templates.
 *
 * `activatedBy` is a PREDICATE-AS-DATA over a REAL JS reference:
 *   { obligation: <ref>, equals|includes|present: <value> }
 * interpreted by state/predicate.js. The reference is a const, so
 * relationships are typed and greppable with none of v1's UUID ceremony.
 *
 * PURITY: this module imports only ./types.js. A stray import of a view,
 * a request or copy would be caught by the boot assertion in routes.js.
 */

const POSTCODE = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/
const REG = /^[A-Za-z]{2}\d{2}\s?[A-Za-z]{3}$/

// ── root obligations (no activatedBy → always in scope) ──
const email = { id: 'email', type: T.EMAIL, required: true }
// fullName is the ONLY save-blocking (hard) mandate in the whole journey.
const fullName = {
  id: 'fullName',
  type: T.TEXT,
  required: true,
  saveBlocking: true
}
const preferredName = { id: 'preferredName', type: T.TEXT }
const phone = { id: 'phone', type: T.TEL }
const postcode = { id: 'postcode', type: T.FORMATTED, pattern: POSTCODE }
const country = {
  id: 'country',
  type: T.SELECT,
  options: ['england', 'scotland', 'wales', 'northern-ireland']
}
const dateOfBirth = { id: 'dateOfBirth', type: T.DATE }
const registration = { id: 'registration', type: T.FORMATTED, pattern: REG }
const make = { id: 'make', type: T.TEXT }
const model = { id: 'model', type: T.TEXT }
const year = { id: 'year', type: T.NUMBER, min: 1900, max: 2100 }
const estimatedValue = { id: 'estimatedValue', type: T.CURRENCY }
// Render-only: the file input is presented but never stored (spike parity).
const vehiclePhoto = { id: 'vehiclePhoto', type: T.FILE, renderOnly: true }
const yearsNoClaims = { id: 'yearsNoClaims', type: T.NUMBER, min: 0, max: 99 }
const hadClaims = { id: 'hadClaims', type: T.BOOLEAN, required: true }
const penaltyPoints = { id: 'penaltyPoints', type: T.NUMBER, min: 0, max: 12 }
const coverType = {
  id: 'coverType',
  type: T.RADIO,
  required: true,
  options: ['comprehensive', 'third-party-fire-theft', 'third-party']
}
const voluntaryExcess = { id: 'voluntaryExcess', type: T.BOOLEAN }
const extras = {
  id: 'extras',
  type: T.MULTISELECT,
  options: ['breakdown', 'courtesy-car', 'legal', 'windscreen']
}
const addons = {
  id: 'addons',
  type: T.MULTISELECT,
  options: ['named-driver', 'modifications', 'protected-ncd']
}

// ── the one repeating collection: claims (0..n, user add/remove) ──
// Identity is (claims, arrayIndex) minted on append — no id ledger.
const claims = {
  id: 'claims',
  type: T.GROUP,
  cardinality: 'indexed',
  fields: ['claimType', 'claimAmount'],
  activatedBy: { obligation: hadClaims, equals: 'yes' },
  requiredAtLeastOne: true,
  wipeOnExit: true
}

// ── conditional reveal — scope/wipe live here; the reveal MARKUP is page-side ──
const excessAmount = {
  id: 'excessAmount',
  type: T.CURRENCY,
  activatedBy: { obligation: voluntaryExcess, equals: 'yes' },
  wipeOnExit: true
}

// ── add-on detail obligations — SINGLE, spawn on selection, wipe on deselect ──
const namedDriverGate = { obligation: addons, includes: 'named-driver' }
const driverName = {
  id: 'driverName',
  type: T.TEXT,
  required: true,
  activatedBy: namedDriverGate,
  wipeOnExit: true
}
const driverDob = {
  id: 'driverDob',
  type: T.DATE,
  activatedBy: namedDriverGate,
  wipeOnExit: true
}
const relationship = {
  id: 'relationship',
  type: T.RADIO,
  required: true,
  options: ['spouse', 'child', 'parent', 'other'],
  activatedBy: namedDriverGate,
  wipeOnExit: true
}

const modificationsGate = { obligation: addons, includes: 'modifications' }
const modDescription = {
  id: 'modDescription',
  type: T.TEXTAREA,
  required: true,
  maxLength: 200,
  activatedBy: modificationsGate,
  wipeOnExit: true
}
const modValue = {
  id: 'modValue',
  type: T.CURRENCY,
  activatedBy: modificationsGate,
  wipeOnExit: true
}

const protectedNcdGate = { obligation: addons, includes: 'protected-ncd' }
const ncdYears = {
  id: 'ncdYears',
  type: T.NUMBER,
  required: true,
  min: 1,
  max: 99,
  activatedBy: protectedNcdGate,
  wipeOnExit: true
}

// ── system-handled: computed on demand, never collected ──
const premium = {
  id: 'premium',
  type: T.QUOTE,
  system: true,
  activatedBy: { obligation: coverType, present: true }
}

const all = [
  email,
  fullName,
  preferredName,
  phone,
  postcode,
  country,
  dateOfBirth,
  registration,
  make,
  model,
  year,
  estimatedValue,
  vehiclePhoto,
  yearsNoClaims,
  hadClaims,
  penaltyPoints,
  claims,
  coverType,
  voluntaryExcess,
  excessAmount,
  extras,
  addons,
  driverName,
  driverDob,
  relationship,
  modDescription,
  modValue,
  ncdYears,
  premium
]

const byIdMap = new Map(all.map((o) => [o.id, o]))

export const registry = {
  all,
  byId: (id) => byIdMap.get(id),
  refs: {
    email,
    fullName,
    preferredName,
    phone,
    postcode,
    country,
    dateOfBirth,
    registration,
    make,
    model,
    year,
    estimatedValue,
    vehiclePhoto,
    yearsNoClaims,
    hadClaims,
    penaltyPoints,
    claims,
    coverType,
    voluntaryExcess,
    excessAmount,
    extras,
    addons,
    driverName,
    driverDob,
    relationship,
    modDescription,
    modValue,
    ncdYears,
    premium
  }
}
