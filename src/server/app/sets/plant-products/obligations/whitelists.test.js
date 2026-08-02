import { beforeAll, describe, expect, it } from 'vitest'

import { createObligationEvaluator } from '../../../model/obligations/evaluator.js'
import { borderControlPost, inspectionPremises, obligations } from './index.js'
import {
  controlPointCodesFor,
  controlPointsFor,
  hasControlPoints,
  list
} from '../services/reference/bcps.js'

let evaluate

beforeAll(() => {
  const evaluator = createObligationEvaluator({ obligations })
  evaluate = (fulfilments) => evaluator.evaluate(fulfilments)
})

describe('BCP premises allowlist', () => {
  it('admits exactly the premises belonging to the selected BCP', () => {
    const bcp = list().find(({ value }) => hasControlPoints(value))
    const premisesCodes = controlPointCodesFor(bcp.value)

    expect(bcp.value).toBe('CONPNT')
    expect(premisesCodes).toEqual(['INSPBAR1', 'INSPBER1'])
    expect(controlPointsFor(bcp.value).map(({ value }) => value)).toEqual(
      premisesCodes
    )

    const state = evaluate({ [borderControlPost.id]: bcp.value })
    expect(state.obligations[inspectionPremises.id].inScope).toBe(true)
  })

  it('keeps inspection premises out of scope for a BCP with no premises', () => {
    const state = evaluate({ [borderControlPost.id]: 'GBLHR4PP' })

    expect(controlPointCodesFor('GBLHR4PP')).toEqual([])
    expect(state.obligations[inspectionPremises.id].inScope).toBe(false)
  })

  it('rejects a control value that is not a premises of the selected BCP', () => {
    const selectedBcp = 'GBLHR4PP'
    const controlPremises = controlPointCodesFor('CONPNT')[0]

    expect(controlPointCodesFor(selectedBcp)).not.toContain(controlPremises)
    expect(
      evaluate({
        [borderControlPost.id]: selectedBcp,
        [inspectionPremises.id]: controlPremises
      }).obligations[inspectionPremises.id].inScope
    ).toBe(false)
  })
})
