import { describe, it, expect } from 'vitest'
import { withSetContext } from '../shared/set-context.js'
import {
  computeReadyForCheckYourAnswers,
  configureReadyForCheckYourAnswers
} from './readiness-config.js'

// The readiness seam's own contract: fail-closed until L1 injects the real
// roll-up. The Vitest global setup injects it for live-animals the way
// `routes-live-animals.js` does, so the unconfigured default is observed from
// set ids nothing else configures — one per case, so neither depends on the
// order the cases run in.

describe('bridge/readiness-config', () => {
  it('Should be fail-closed for a set that never configured the seam', () =>
    withSetContext('readiness-never-configured', () => {
      expect(computeReadyForCheckYourAnswers({}, new Set(), {})).toBe(false)
    }))

  it('Should return the injected roll-up once configured', () =>
    withSetContext('readiness-configured', () => {
      configureReadyForCheckYourAnswers('readiness-configured', () => true)

      expect(computeReadyForCheckYourAnswers({}, new Set(), {})).toBe(true)
    }))

  it('Should hand the roll-up the answers, the scope and the evaluation', () =>
    withSetContext('readiness-arguments', () => {
      const answers = { shipmentReference: 'SR-1' }
      const inScope = new Set(['shipmentReference'])
      const evaluation = { obligations: {} }
      configureReadyForCheckYourAnswers(
        'readiness-arguments',
        (...args) => args
      )

      expect(
        computeReadyForCheckYourAnswers(answers, inScope, evaluation)
      ).toEqual([answers, inScope, evaluation])
    }))
})
