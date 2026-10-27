import { beforeEach, describe, expect, it } from 'vitest'
import { commit } from './index.js'
import { stubH, purgeTestJourney } from './test-support.js'

const REGION_ANSWERED = {
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'yes',
  regionOfOriginCode: 'FR-75'
}
const TURN_REGION_GATE_OFF = { regionOfOriginCodeRequirement: 'no' }

const PURPOSE_ANSWERED = {
  reasonForImport: 'internalMarket',
  purposeInInternalMarket: 'breeding'
}
const TURN_PURPOSE_GATE_OFF = { reasonForImport: 'research' }

let buildRequest, seed, durable, wipeOf

describe('#commit — evaluator-authoritative purge', () => {
  beforeEach(async () => {
    ;({ buildRequest, seed, durable, wipeOf } = await purgeTestJourney())
  })

  it('Should retain regionOfOriginCode when its gate is answered "no" (retain-value)', async () => {
    await seed(REGION_ANSWERED)
    const { answers } = await commit(
      buildRequest(),
      stubH(),
      TURN_REGION_GATE_OFF
    )
    expect(
      wipeOf({ ...REGION_ANSWERED, ...TURN_REGION_GATE_OFF })
    ).not.toContain('regionOfOriginCode')
    expect(answers.regionOfOriginCode).toBe(REGION_ANSWERED.regionOfOriginCode)
    expect((await durable()).regionOfOriginCode).toBe(
      REGION_ANSWERED.regionOfOriginCode
    )
  })

  it('Should destroy exactly the evaluator purge set', async () => {
    await seed(PURPOSE_ANSWERED)
    const merged = { ...PURPOSE_ANSWERED, ...TURN_PURPOSE_GATE_OFF }
    const expectedWipe = wipeOf(merged)

    const { answers } = await commit(
      buildRequest(),
      stubH(),
      TURN_PURPOSE_GATE_OFF
    )

    expect(expectedWipe).toContain('purposeInInternalMarket')
    const destroyed = Object.keys(merged).filter(
      (key) => answers[key] === undefined
    )
    expect(destroyed).toEqual(expectedWipe)
    expect(answers.reasonForImport).toBe('research')
  })
})
