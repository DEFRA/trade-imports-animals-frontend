/**
 * Sole author of the dotted, locale-agnostic reason codes (obligations.md
 * §J, 1795-1838). A reason is `{ code, explanation, values? }`: the code
 * doubles as the i18n key, the explanation is developer-facing only, the
 * values interpolate into the resolved UI message. This registry is kept in
 * lockstep with model/messages.en.json by test — every code here has copy
 * there and vice versa, so a raw code can never reach the DOM.
 */

const EXPLANATIONS = {
  'scope.answered':
    'Provenance: names the controlling answer that brought this obligation into scope',
  'mandate.fullName.missing':
    'fullName is engine-mandatory and page-hard on About you (the only page-hard field, Rulings item 3)',
  'mandate.email.missing': 'email is engine-mandatory; blocks at CYA POST only',
  'mandate.registration.missing':
    'registration is engine-mandatory; blocks at CYA POST only',
  'mandate.hadClaims.missing':
    'hadClaims is engine-mandatory; blocks at CYA POST only',
  'mandate.coverType.missing':
    'coverType is engine-mandatory; blocks at CYA POST only',
  'mandate.excessAmount.missing':
    'excessAmount is engine-mandatory while voluntaryExcess is yes',
  'mandate.extras.missing':
    'extras is engine-mandatory; an answered empty selection satisfies it',
  'mandate.claimType.atLeastOne':
    'the claims collection needs at least one fulfilment while hadClaims is yes',
  'mandate.addons.finishSelected':
    'addons must be answered and every selected add-on finished before the journey can complete',
  'format.email.invalid': 'filled email fails the email format check',
  'format.postcode.invalid': 'filled postcode fails the UK postcode pattern',
  'format.registration.invalid': 'filled registration fails the plate pattern',
  'format.dateOfBirth.notRealDate':
    'dateOfBirth parts are partial or do not form a real calendar date',
  'format.driverDob.notRealDate':
    'driverDob parts are partial or do not form a real calendar date',
  'format.year.notNumber': 'filled year is not numeric',
  'format.year.notWholeNumber': 'filled year is not a whole number',
  'format.year.outOfRange': 'filled year is outside 1900-2100',
  'format.yearsNoClaims.notNumber': 'filled yearsNoClaims is not numeric',
  'format.yearsNoClaims.notWholeNumber':
    'filled yearsNoClaims is not a whole number',
  'format.yearsNoClaims.outOfRange': 'filled yearsNoClaims is outside 0-99',
  'format.penaltyPoints.notNumber': 'filled penaltyPoints is not numeric',
  'format.penaltyPoints.notWholeNumber':
    'filled penaltyPoints is not a whole number',
  'format.penaltyPoints.outOfRange': 'filled penaltyPoints is outside 0-12',
  'format.ncdYears.wholeNumberRange':
    'filled ncdYears is not a whole number between 1 and 99',
  'format.estimatedValue.notAmount': 'filled estimatedValue is not an amount',
  'format.estimatedValue.notPositive':
    'filled estimatedValue is zero or negative',
  'format.excessAmount.notAmount': 'filled excessAmount is not an amount',
  'format.excessAmount.notPositive': 'filled excessAmount is zero or negative',
  'format.claimAmount.invalid':
    'filled claimAmount is not a whole number of pounds greater than 0',
  'format.modValue.invalid':
    'filled modValue is not a whole number of pounds greater than 0',
  'rule.dateOfBirth.minAge':
    'CYA-submit business rule: the main driver must be at least 17',
  'rule.excessAmount.withinValue':
    'CYA-submit business rule: excess must not exceed the estimated value'
}

/** Every reason code the engine and validation may emit, sorted. */
export const reasonCodes = Object.freeze(Object.keys(EXPLANATIONS).sort())

/** Build a reason record; throws on codes outside the registry. */
export function reason(code, values) {
  const explanation = EXPLANATIONS[code]
  if (!explanation) {
    throw new Error(`Unknown reason code "${code}"`)
  }
  return values ? { code, explanation, values } : { code, explanation }
}

/** 'hadClaims' -> 'Had claims' — the display form of an obligation name. */
export function humaniseName(name) {
  const spaced = name.replace(/([A-Z])/g, ' $1').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/**
 * The scope-provenance reason: 'You answered "{answer}" for {field}'.
 * Interpolation values are authored here so every emitter agrees on them.
 */
export function scopeAnswered(answer, controllerName) {
  return reason('scope.answered', {
    answer,
    field: humaniseName(controllerName)
  })
}
