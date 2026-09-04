import { describe, expect, it } from 'vitest'
import { createObligationEvaluator } from './evaluator.js'
import { allowListed } from './helpers/index.js'

// A gate that itself sits at depth >= 2 and projects a deeper obligation must
// match its fulfilmentIndexes by full-prefix, not by the first segment.
// When a projection fulfilmentIndex is sliced at its first delimiter,
// `runIndexedGate` only ever matches a gate whose indexedFulfilments keys
// are one segment long, so a deeper gate matches nothing, reports
// `inScope: false`, and `purgeStorage`'s apply-to-derived branch then deletes
// the user's stored entries — silent data loss. The fix tests each passing
// key as a real prefix
// (`key === '' || path === key || path.startsWith(`${key}.`)`); the
// empty-key case matters because `runIndexedGate` uses `''` as the key for
// an unindexed (non-indexedFulfilments) gate.
describe('a gate at depth >= 2 that projects', () => {
  // Three nested groups, one segment of composite key each:
  //
  //   line        depth 1   keys 'line1'
  //   unit        depth 2   keys 'line1.unit1'
  //   subUnit     depth 3   keys 'line1.unit1.sub1'
  //
  // `unitFlag` is the gate. It is `within: unit`, so its stored keys are
  // two segments ('line1.unit1'). `subDetail` is gated on it and projects
  // onto `subUnit`, whose paths are three segments.
  const buildManifest = () => {
    const line = { id: 'line' }
    const unit = { id: 'unit', within: line }
    const subUnit = { id: 'subUnit', within: unit }
    const unitFlag = { id: 'unitFlag', within: unit, status: 'mandatory' }
    const subDetail = {
      id: 'subDetail',
      within: subUnit,
      status: 'mandatory',
      applyTo: allowListed(unitFlag, ['yes'], subUnit)
    }
    return [line, unit, subUnit, unitFlag, subDetail]
  }

  // The gate says 'yes' on the only unit, so the sub-instance below it is in
  // scope and its value must survive the purge.
  const fulfilments = {
    unitFlag: { 'line1.unit1': 'yes' },
    subDetail: { 'line1.unit1.sub1': 'the user typed this' }
  }

  const evaluateFixture = () => {
    const evaluator = createObligationEvaluator({
      obligations: buildManifest()
    })
    return evaluator.evaluate(fulfilments)
  }

  it('Should keep the stored entry of a gated-in leaf below a depth-2 gate', () => {
    const result = evaluateFixture()

    expect(result.fulfilments.subDetail).toEqual({
      'line1.unit1.sub1': 'the user typed this'
    })
  })

  it('Should report the leaf in scope on the fulfilmentIndex its depth-2 gate admits', () => {
    const result = evaluateFixture()

    expect(result.obligations.subDetail).toMatchObject({
      inScope: true,
      status: 'mandatory',
      fulfilmentIndexes: ['line1.unit1.sub1']
    })
  })

  it('Should still purge the entry when the depth-2 gate does not admit it', () => {
    const evaluator = createObligationEvaluator({
      obligations: buildManifest()
    })

    // The negative case passes even with the prefix bug — for the wrong reason.
    // It is here so the fix cannot buy the two tests above by making the gate
    // admit everything.
    const result = evaluator.evaluate({
      ...fulfilments,
      unitFlag: { 'line1.unit1': 'no' }
    })

    expect(result.fulfilments.subDetail).toBeUndefined()
    expect(result.obligations.subDetail).toEqual({ inScope: false })
  })
})
