import { describe, expect, it } from 'vitest'

// SKIPPED UNTIL inc-006 — un-skip this whole file there, do not rewrite it.
//
// It pins the `pathPrefix` bug that inc-006 fixes (PLAN 5.3):
// `obligations/helpers.js` slices a projection path at the FIRST slash, so
// `filterAndProject` only ever matches a gate whose record keys are ONE
// segment long — a gate `within` a depth-1 group. A gate that itself sits at
// depth >= 2 and projects deeper matches nothing, its applyTo reports
// `inScope: false`, and `purgeStorage`'s derived-leaf branch then DELETES the
// user's stored records. Data loss, silently.
//
// The fix is to test each passing key as a real path prefix rather than
// slicing the projection path at its first slash. inc-003 verified this
// against B @ 34550a3 by vendoring the model temporarily: the two tests below
// fail on the shipped `pathPrefix`, and replacing the `filterAndProject`
// filter with
//
//   passingKeys.some((key) => key === '' || path === key ||
//                             path.startsWith(`${key}/`))
//
// turns all three green with no other change. The empty-key case matters —
// `filterAndProject` uses `''` as the key for a scalar (non-record-map) gate.
//
// Skipped rather than red for two reasons:
//   1. B's model is not vendored until inc-005, so the imports below cannot
//      resolve yet. They are dynamic so that module load does not break the
//      suite while this file is skipped.
//   2. The verify gate must stay green; a committed red test cannot do that.
//
// inc-006: vendor path is `../model/obligations/` per PLAN M1 inc-005. If that
// landed somewhere else, fix the two specifiers and nothing else.
describe.skip('pathPrefix — a gate at depth >= 2 that projects (inc-006 fixes this)', () => {
  const loadModel = async () => {
    const { createObligationEvaluator } =
      await import('../model/obligations/evaluator.js')
    const { allowListed } = await import('../model/obligations/helpers.js')
    return { createObligationEvaluator, allowListed }
  }

  // Three nested groups, one segment of composite key each:
  //
  //   line        depth 1   keys 'line1'
  //   unit        depth 2   keys 'line1/unit1'
  //   subUnit     depth 3   keys 'line1/unit1/sub1'
  //
  // `unitFlag` is the gate. It is `within: unit`, so its stored keys are
  // TWO segments ('line1/unit1'). `subDetail` is gated on it and projects
  // onto `subUnit`, whose paths are three segments.
  //
  // pathPrefix('line1/unit1/sub1') returns 'line1', which is not in the
  // passing-key set ['line1/unit1'] — so the record is dropped.
  const buildManifest = (allowListed) => {
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

  // The gate says 'yes' on the only unit, so the sub-record below it is in
  // scope and its value must survive the purge.
  const fulfilments = {
    unitFlag: { 'line1/unit1': 'yes' },
    subDetail: { 'line1/unit1/sub1': 'the user typed this' }
  }

  const evaluateFixture = async () => {
    const { createObligationEvaluator, allowListed } = await loadModel()
    const evaluator = createObligationEvaluator({
      obligations: buildManifest(allowListed)
    })
    return evaluator.evaluate(fulfilments)
  }

  it('Should keep the stored record of a gated-in leaf below a depth-2 gate', async () => {
    const result = await evaluateFixture()

    // Today: `undefined` — purgeStorage dropped the entry outright.
    expect(result.fulfilments.subDetail).toEqual({
      'line1/unit1/sub1': 'the user typed this'
    })
  })

  it('Should report the leaf in scope on the record its depth-2 gate admits', async () => {
    const result = await evaluateFixture()

    // Today: `{ inScope: false }` — filterAndProject matched no path.
    expect(result.obligations.subDetail).toMatchObject({
      inScope: true,
      records: [{ fulfilmentId: 'line1/unit1/sub1', status: 'mandatory' }]
    })
  })

  it('Should still purge the record when the depth-2 gate does not admit it', async () => {
    const { createObligationEvaluator, allowListed } = await loadModel()
    const evaluator = createObligationEvaluator({
      obligations: buildManifest(allowListed)
    })

    // The negative case passes even with the bug — for the wrong reason. It is
    // here so inc-006's fix cannot buy the two tests above by making the gate
    // admit everything.
    const result = evaluator.evaluate({
      ...fulfilments,
      unitFlag: { 'line1/unit1': 'no' }
    })

    expect(result.fulfilments.subDetail).toBeUndefined()
    expect(result.obligations.subDetail).toEqual({ inScope: false })
  })
})
