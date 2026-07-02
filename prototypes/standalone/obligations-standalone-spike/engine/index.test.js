import { describe, it, expect } from 'vitest'
import * as engine from './index.js'

describe('engine/index — the doc-shaped barrel (smoke)', () => {
  it('exposes the one-call evaluator plus the Level-1 primitives', () => {
    expect(Object.keys(engine).sort()).toEqual([
      'COMPLETION_POLICIES',
      'ENGINE_MANDATORY_ALWAYS',
      'JOURNEY_COMPLETION_POLICY',
      'MANDATE_COMPOSITION',
      'blocksSave',
      'composeMandate',
      'createIdentifierIndex',
      'createJourneyScopeRegistry',
      'createScopeRegistry',
      'demos',
      'evaluateObligations',
      'humaniseName',
      'journeyScopeRegistry',
      'loadJourneyModel',
      'loadModel',
      'pruneFulfilments',
      'reason',
      'reasonCodes',
      'resolveCompletionPolicy',
      'scopeAnswered',
      'typeCompanions',
      'unfulfilledMandatory'
    ])
  })

  it('runs the real model end to end through the barrel alone', () => {
    const { obligations } = engine.loadJourneyModel({
      scopeRegistry: engine.journeyScopeRegistry
    })
    const evaluation = engine.evaluateObligations(obligations, {})
    expect(Object.keys(evaluation).sort()).toEqual([
      'drops',
      'fulfilments',
      'obligations'
    ])
    expect(Object.keys(evaluation.obligations)).toHaveLength(30)
    expect(
      engine.unfulfilledMandatory(evaluation).map((gap) => gap.name)
    ).toEqual(engine.ENGINE_MANDATORY_ALWAYS)
  })
})
