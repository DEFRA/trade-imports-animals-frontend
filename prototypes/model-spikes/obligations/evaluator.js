import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * ObligationEvaluator — iteration 3.
 *
 * Pure sync evaluator per §The ObligationEvaluator in
 * prototypes/model-spikes/obligations.md. Constructed once per Service with
 * the Obligations model; each evaluate(fulfilments) call is pure. Other
 * injectable dependencies (config, now, randomSeed, logger, …) can be added
 * to the constructor options object as they become needed — see §I.
 *
 * Iteration 3 introduces appliesWhen (in-scope flipping) + scope-exit purge.
 * When an obligation goes out of scope, its fulfilment is dropped from the
 * amended fulfilments map. Iteration 2's mandatoryWhen pattern is retained
 * via licenseCountryIssued (in-scope-always; status flips).
 *
 * Still deferred: indexed obligations (iteration 4); system-handled types
 * (iteration 5); transitive scope dependencies / fixed-point evaluation
 * (probably a small refactor when the concrete case surfaces).
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const parsedObligations = JSON.parse(
  fs.readFileSync(path.join(dirname, 'obligations.json'), 'utf8')
)

export function createObligationEvaluator({
  obligations = parsedObligations
} = {}) {
  const idByName = new Map(obligations.map((o) => [o.name, o.id]))
  const obligationIds = new Set(obligations.map((o) => o.id))

  // Per-obligation evaluator functions. Each takes the tolerance-amended
  // fulfilments and returns { inScope, status?, reasons? } per
  // §The ObligationEvaluator.
  const perObligation = {
    fullName: () => ({ inScope: true, status: 'mandatory' }),

    dateOfBirth: () => ({ inScope: true, status: 'mandatory' }),

    hasVoluntaryExcess: () => ({ inScope: true, status: 'mandatory' }),

    // appliesWhen: excessAmount only applies (in-scope) when the user
    // has opted for voluntary excess. Scope-exit purges any stored value.
    excessAmount: (fulfilments) => {
      const hasExcess = fulfilments[idByName.get('hasVoluntaryExcess')]
      if (hasExcess === true) {
        return {
          inScope: true,
          status: 'mandatory',
          reasons: [
            {
              code: 'obligation.excessAmount.applicable.becauseVoluntaryExcess',
              explanation:
                'excessAmount applies when hasVoluntaryExcess is true'
            }
          ]
        }
      }
      return { inScope: false }
    },

    hasNamedDriver: () => ({ inScope: true, status: 'mandatory' }),

    // appliesWhen: namedDriverName only applies when the user has a
    // named driver. Scope-exit purges any stored value.
    namedDriverName: (fulfilments) => {
      const hasNamedDriver = fulfilments[idByName.get('hasNamedDriver')]
      if (hasNamedDriver === true) {
        return {
          inScope: true,
          status: 'mandatory',
          reasons: [
            {
              code: 'obligation.namedDriverName.applicable.becauseNamedDriver',
              explanation: 'namedDriverName applies when hasNamedDriver is true'
            }
          ]
        }
      }
      return { inScope: false }
    },

    licenseType: () => ({ inScope: true, status: 'mandatory' }),

    // mandatoryWhen: licenseCountryIssued is always in-scope (meaningful
    // for anyone — defaults to UK for standard licenses) but only required
    // when the license type is 'other'. Value is retained across
    // condition changes; no purge.
    licenseCountryIssued: (fulfilments) => {
      const licenseType = fulfilments[idByName.get('licenseType')]
      if (licenseType === 'other') {
        return {
          inScope: true,
          status: 'mandatory',
          reasons: [
            {
              code: 'obligation.licenseCountryIssued.mandatory.becauseLicenseTypeOther',
              explanation:
                'licenseCountryIssued is mandatory when licenseType is other'
            }
          ]
        }
      }
      return { inScope: true, status: 'optional' }
    }
  }

  // Fail loud and early at construction if any obligation lacks a registered
  // evaluator function — better to know at boot than at first request.
  for (const obligation of obligations) {
    if (!perObligation[obligation.name]) {
      throw new Error(
        `No evaluator function registered for obligation "${obligation.name}"`
      )
    }
  }

  return {
    evaluate(fulfilments) {
      // 1. Tolerate-and-amend: drop fulfilments whose id isn't in the current
      //    obligations model.
      const toleranceAmended = {}
      for (const [id, value] of Object.entries(fulfilments)) {
        if (obligationIds.has(id)) {
          toleranceAmended[id] = value
        }
      }

      // 2. Per-obligation state — single-pass evaluation against the
      //    tolerance-amended fulfilments. Fixed-point behaviour lives in
      //    the orchestrator per §The evaluation engine.
      const perObligationState = {}
      for (const obligation of obligations) {
        perObligationState[obligation.id] =
          perObligation[obligation.name](toleranceAmended)
      }

      // 3. Scope-exit purge: drop fulfilments for obligations now
      //    out-of-scope. Matches §Fulfilments storage scope-exit rule
      //    and the Scope-exit row in §Key properties.
      const amendedFulfilments = { ...toleranceAmended }
      for (const [id, state] of Object.entries(perObligationState)) {
        if (state.inScope === false) {
          delete amendedFulfilments[id]
        }
      }

      return {
        fulfilments: amendedFulfilments,
        obligations: perObligationState
      }
    }
  }
}
