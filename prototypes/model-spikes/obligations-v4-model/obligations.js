/**
 * Obligations — Live Animals V4 data-field model.
 *
 * Source: Confluence "Live Animals Data Fields - V4" (page 6497338582).
 * Model under test: obligations model from EUDPA-249 spike (see
 * ../obligations/). This manifest expresses the V4 domain against that
 * model; see GAPS.md for anything the model can't express naturally.
 *
 * Smoke slice (step 1 of the modelling walk): notification-level Country
 * of origin plus the regionCodeRequirement / regionCode conditional
 * gate. Enough to prove the copied evaluator wires up against a fresh
 * domain and demonstrate the single-cardinality gate pattern from V4.
 * Subsequent iterations add address blocks, commodity lines, unit
 * records and the Accompanying Document block.
 *
 * System-populated fields (Reference Number, gov.identity-fed Responsible
 * Person, MDM-sourced enum values) are stubbed in test fixtures rather
 * than modelled as obligations.
 */

// -----------------------------------------------------------------------------
// Notification-level singles
// -----------------------------------------------------------------------------

export const countryOfOrigin = {
  id: 'a01b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  name: 'countryOfOrigin',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const regionCodeRequirement = {
  id: 'b12c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
  name: 'regionCodeRequirement',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// Conditional: required when regionCodeRequirement === 'yes'. Modelled
// as always-in-scope-with-optional-status when the gate is off, so a
// previously-entered value is retained across gate flips (matches the
// V4 spec: the field itself is not purged on `no`).
export const regionCode = {
  id: 'c23d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f',
  name: 'regionCode',
  applyTo: (fulfilments) => {
    if (fulfilments[regionCodeRequirement.id] === 'yes') {
      return {
        inScope: true,
        status: 'mandatory',
        reasons: [
          {
            code: 'obligation.regionCode.mandatory.becauseRegionCodeRequired',
            explanation:
              'regionCode is mandatory when regionCodeRequirement is yes'
          }
        ]
      }
    }
    return { inScope: true, status: 'optional' }
  }
}

// -----------------------------------------------------------------------------
// Manifest — order does not affect evaluation (evaluator builds group
// hierarchy via `within` back-references).
// -----------------------------------------------------------------------------

export const obligations = [countryOfOrigin, regionCodeRequirement, regionCode]

// Groups are obligations that other obligations reference via `within`.
export const groups = obligations.filter((o) =>
  obligations.some((other) => other.within === o)
)
