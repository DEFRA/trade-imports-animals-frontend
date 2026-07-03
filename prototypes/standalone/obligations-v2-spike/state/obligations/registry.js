/**
 * THE obligation catalogue — plain-JS data (the v2 inversion of v1's
 * UUID-keyed JSON). A def carries only IDENTITY, RELATIONSHIPS and
 * STRUCTURAL STATE FACTS:
 *   - `id`               — the store key + DOM field name
 *   - `required` / `requiredAtLeastOne` — "what is OWED" (completion facts the
 *                          status roll-up reads; NOT save-time validation)
 *   - `activatedBy` / `wipeOnExit` — scope + Yes-No-Yes wipe relationships
 *   - `cardinality` / `fields` — the shape of a repeating collection (claims)
 *   - `system`           — computed, never collected (premium)
 *   - `renderOnly`       — presented but never stored (vehiclePhoto)
 *
 * There is deliberately NO `type` and NO validation here. A presentation-shaped
 * "type" taxonomy (text/date/currency/radio/textarea/file…) leaked *how a value
 * renders* into the model — the page template owns that. And validation is NOT
 * an obligation's to own: the same value may be validated differently on a page,
 * a controller or a future mapping layer, so it lives in the CONTROLLERS, drawn
 * from the reusable, context-agnostic Joi helpers in `lib/validate/`. The
 * obligation stays ignorant of validation; coupling is loose, via the schema a
 * controller assembles — never a schema stamped on the record. Value-domains,
 * formats, ranges and the sole hard mandate are all controller-owned validators.
 *
 * `activatedBy` is a PREDICATE-AS-DATA over a REAL JS reference:
 *   { obligation: <ref>, equals|includes|present: <value> }
 * interpreted by state/predicate.js. The reference is a const, so relationships
 * are typed and greppable with none of v1's UUID ceremony.
 *
 * PURITY: this module imports nothing. A stray import of a view, a request or
 * copy would be caught by the boot assertion in routes.js.
 */

// ── root obligations (no activatedBy → always in scope) ──
const email = { id: 'email', required: true }
// fullName is the ONLY save-blocking (hard) mandate in the whole journey —
// expressed as a controller-owned Joi rule (about-you), not a def flag.
const fullName = { id: 'fullName', required: true }
const preferredName = { id: 'preferredName' }
const phone = { id: 'phone' }
const postcode = { id: 'postcode' }
const country = { id: 'country' }
const dateOfBirth = { id: 'dateOfBirth' }
const registration = { id: 'registration' }
const make = { id: 'make' }
const model = { id: 'model' }
const year = { id: 'year' }
const estimatedValue = { id: 'estimatedValue' }
// Render-only: the file input is presented but never stored (spike parity).
const vehiclePhoto = { id: 'vehiclePhoto', renderOnly: true }
const yearsNoClaims = { id: 'yearsNoClaims' }
const hadClaims = { id: 'hadClaims', required: true }
const penaltyPoints = { id: 'penaltyPoints' }
const coverType = { id: 'coverType', required: true }
const voluntaryExcess = { id: 'voluntaryExcess' }
const extras = { id: 'extras' }
const addons = { id: 'addons' }

// ── the one repeating collection: claims (0..n, user add/remove) ──
// Identity is (claims, arrayIndex) minted on append — no id ledger. cardinality
// + fields describe the value's JSON SHAPE (an array of { claimType, claimAmount }),
// a structural state fact — not a "type" and not validation.
const claims = {
  id: 'claims',
  cardinality: 'indexed',
  fields: ['claimType', 'claimAmount'],
  activatedBy: { obligation: hadClaims, equals: 'yes' },
  requiredAtLeastOne: true,
  wipeOnExit: true
}

// ── conditional reveal — scope/wipe live here; the reveal MARKUP is page-side ──
const excessAmount = {
  id: 'excessAmount',
  activatedBy: { obligation: voluntaryExcess, equals: 'yes' },
  wipeOnExit: true
}

// ── add-on detail obligations — SINGLE, spawn on selection, wipe on deselect ──
const namedDriverGate = { obligation: addons, includes: 'named-driver' }
const driverName = {
  id: 'driverName',
  required: true,
  activatedBy: namedDriverGate,
  wipeOnExit: true
}
const driverDob = {
  id: 'driverDob',
  activatedBy: namedDriverGate,
  wipeOnExit: true
}
const relationship = {
  id: 'relationship',
  required: true,
  activatedBy: namedDriverGate,
  wipeOnExit: true
}

const modificationsGate = { obligation: addons, includes: 'modifications' }
const modDescription = {
  id: 'modDescription',
  required: true,
  activatedBy: modificationsGate,
  wipeOnExit: true
}
const modValue = {
  id: 'modValue',
  activatedBy: modificationsGate,
  wipeOnExit: true
}

const protectedNcdGate = { obligation: addons, includes: 'protected-ncd' }
const ncdYears = {
  id: 'ncdYears',
  required: true,
  activatedBy: protectedNcdGate,
  wipeOnExit: true
}

// ── system-handled: computed on demand, never collected ──
const premium = {
  id: 'premium',
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
