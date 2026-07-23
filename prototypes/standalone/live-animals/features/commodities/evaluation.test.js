import { describe, expect, it } from 'vitest'
import { assembleFeature } from '../../bridge/fulfilment-bindings.js'
import { evaluationBindings } from './evaluation.js'
import {
  commodityCode,
  earTag,
  numberOfAnimals
} from '../../model/obligations/obligations.js'

describe('commodities evaluation bindings', () => {
  it('Should visit each line and nested unit collection once', () => {
    let lineWalks = 0
    let unitWalks = 0
    const line = {
      commoditySelection: 'Cow',
      numberOfAnimalsQuantity: '1',
      get animalIdentifiers() {
        unitWalks += 1
        return [{ animalIdentifierEarTag: 'UK123456789012' }]
      }
    }
    const answers = {
      get commodityLines() {
        lineWalks += 1
        return [line]
      }
    }

    const contribution = assembleFeature(evaluationBindings, answers)

    expect(lineWalks).toBe(1)
    expect(unitWalks).toBe(1)
    expect(contribution).toMatchObject({
      [commodityCode.id]: { line0: 'Cow' },
      [numberOfAnimals.id]: { line0: 1 },
      [earTag.id]: { 'line0/unit0': 'UK123456789012' }
    })
  })
})
