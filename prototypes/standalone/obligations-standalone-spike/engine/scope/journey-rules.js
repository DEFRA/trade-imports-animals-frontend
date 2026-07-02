import { createScopeRegistry } from './registry.js'
import { reason, scopeAnswered } from '../reasons.js'

/**
 * The concrete car-insurance journey predicates — THE canonical
 * engine-mandatory set, reverse-engineered from spike-a's allComplete
 * (parity ruling c): email, fullName, registration, hadClaims, coverType,
 * extras and addons always; excessAmount while voluntaryExcess is yes; at
 * least one claim while hadClaims is yes; and the completion fields of each
 * selected add-on (driverDob is deliberately absent — spike-a's named-driver
 * step counts complete on driverName + relationship alone).
 *
 * Per Rulings item 3 every mandate here is page-soft except fullName's
 * page-hard flag, which lives in flow.json — these rules only decide the
 * engine dimension (blocks at CYA POST, never at page save).
 *
 * Rules read journey state through the evaluator's name view:
 * `view.valueOf(name)` returns a single obligation's stored value.
 */

/** The unconditionally engine-mandatory obligations, in catalogue order. */
export const ENGINE_MANDATORY_ALWAYS = Object.freeze([
  'email',
  'fullName',
  'registration',
  'hadClaims',
  'coverType',
  'extras',
  'addons'
])

const MANDATE_CODES = {
  email: 'mandate.email.missing',
  fullName: 'mandate.fullName.missing',
  registration: 'mandate.registration.missing',
  hadClaims: 'mandate.hadClaims.missing',
  coverType: 'mandate.coverType.missing',
  extras: 'mandate.extras.missing',
  addons: 'mandate.addons.finishSelected'
}

const always = (code) => () => ({
  status: 'mandatory',
  reasons: [reason(code)]
})

const whenAnswered = (controller, answer, outcome) => (view) =>
  view.valueOf(controller) === answer ? outcome() : null

const whenAddonSelected = (addon, outcome) => (view) => {
  const selected = view.valueOf('addons')
  return Array.isArray(selected) && selected.includes(addon) ? outcome() : null
}

const mandatoryFollowUp = (addon) => () => ({
  status: 'mandatory',
  reasons: [
    scopeAnswered(addon, 'addons'),
    reason('mandate.addons.finishSelected')
  ]
})

const optionalFollowUp = (addon) => () => ({
  reasons: [scopeAnswered(addon, 'addons')]
})

/** Build and populate the journey registry (exported for fixture reuse). */
export function createJourneyScopeRegistry() {
  const registry = createScopeRegistry()

  for (const name of ENGINE_MANDATORY_ALWAYS) {
    registry.register(name, 'alwaysRequired', always(MANDATE_CODES[name]))
  }

  registry.register(
    'excessAmount',
    'voluntaryExcessIsYes',
    whenAnswered('voluntaryExcess', 'yes', () => ({
      status: 'mandatory',
      reasons: [
        scopeAnswered('yes', 'voluntaryExcess'),
        reason('mandate.excessAmount.missing')
      ]
    }))
  )

  registry.register(
    'claimType',
    'hadClaimsIsYes',
    whenAnswered('hadClaims', 'yes', () => ({
      status: 'mandatory',
      reasons: [
        scopeAnswered('yes', 'hadClaims'),
        reason('mandate.claimType.atLeastOne')
      ]
    }))
  )

  registry.register(
    'claimAmount',
    'hadClaimsIsYes',
    whenAnswered('hadClaims', 'yes', () => ({
      reasons: [scopeAnswered('yes', 'hadClaims')]
    }))
  )

  const followUps = [
    ['driverName', 'named-driver', mandatoryFollowUp],
    ['driverDob', 'named-driver', optionalFollowUp],
    ['relationship', 'named-driver', mandatoryFollowUp],
    ['modDescription', 'modifications', mandatoryFollowUp],
    ['modValue', 'modifications', mandatoryFollowUp],
    ['ncdYears', 'protected-ncd', mandatoryFollowUp]
  ]
  for (const [name, addon, outcome] of followUps) {
    registry.register(
      name,
      `addonSelected:${addon}`,
      whenAddonSelected(addon, outcome(addon))
    )
  }

  return registry
}

/**
 * The shared journey registry. Everything unregistered — preferredName,
 * phone, postcode, country, dateOfBirth, make, model, year, estimatedValue,
 * vehiclePhoto, yearsNoClaims, penaltyPoints, voluntaryExcess and the
 * system-handled premium — falls to the evaluator default: always in
 * scope, optional.
 */
export const journeyScopeRegistry = createJourneyScopeRegistry()
