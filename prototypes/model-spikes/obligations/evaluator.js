import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * ObligationEvaluator — iteration 2.
 *
 * Pure sync evaluator per §The ObligationEvaluator in
 * prototypes/model-spikes/obligations.md. Constructed once per Service with
 * the Obligations model; each evaluate(fulfilments) call is pure. Other
 * injectable dependencies (config, now, randomSeed, logger, …) can be added
 * to the constructor options object as they become needed — see §I.
 *
 * Iteration 2 introduces conditional mandate (mandatoryWhen-style): an
 * obligation stays in-scope but its status can flip between 'mandatory' and
 * 'optional' based on other fulfilments. When a condition drives a mandatory
 * state, an authored reason is emitted per §J code shape.
 *
 * Still deferred: appliesWhen (in-scope flipping) + scope-exit purge
 * (iteration 3); indexed obligations (iteration 4); system-handled types
 * (iteration 5).
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const shippedObligations = JSON.parse(
  fs.readFileSync(path.join(dirname, 'obligations.json'), 'utf8')
)

export function createObligationEvaluator({
  obligations = shippedObligations
} = {}) {
  const idByName = new Map(obligations.map((o) => [o.name, o.id]))
  const obligationIds = new Set(obligations.map((o) => o.id))

  // Per-obligation evaluator functions. Each takes the amended fulfilments and
  // returns { inScope, status?, reasons? } per §The ObligationEvaluator.
  const perObligation = {
    fullName: () => ({ inScope: true, status: 'mandatory' }),

    dateOfBirth: () => ({ inScope: true, status: 'mandatory' }),

    hasVoluntaryExcess: () => ({ inScope: true, status: 'mandatory' }),

    excessAmount: (fulfilments) => {
      const hasExcess = fulfilments[idByName.get('hasVoluntaryExcess')]
      if (hasExcess === true) {
        return {
          inScope: true,
          status: 'mandatory',
          reasons: [
            {
              code: 'obligation.excessAmount.mandatory.becauseVoluntaryExcess',
              explanation:
                'excessAmount is mandatory when hasVoluntaryExcess is true'
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
      const amendedFulfilments = {}
      for (const [id, value] of Object.entries(fulfilments)) {
        if (obligationIds.has(id)) {
          amendedFulfilments[id] = value
        }
      }

      const perObligationState = {}
      for (const obligation of obligations) {
        perObligationState[obligation.id] =
          perObligation[obligation.name](amendedFulfilments)
      }

      return {
        fulfilments: amendedFulfilments,
        obligations: perObligationState
      }
    }
  }
}
