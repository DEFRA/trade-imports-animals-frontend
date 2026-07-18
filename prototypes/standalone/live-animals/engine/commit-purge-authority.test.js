import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { commit } from './index.js'
import { records, configureRecords } from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { wipeSetFromB } from '../model/bridge/purge.js'
import { stubH, journeyRequest } from './test-support.js'

// inc-013 dual-paths the write purge: under `a` the wipe authority is A's
// `reconcile`; under `b` it is B's evaluator purge. These prove `commit`
// selects the authority by flag while sharing A's session/journey/save layer.
//
// The region-requirement gate is the c-017 case: answering the requirement
// 'no' flips regionOfOriginCode out of scope. Both engines wipe the stored
// code — B's retain-value branch was ruled wrong (c-017) and fixed in B's
// manifest at inc-016a, so B now purges it too. The purpose gate is a second
// case both engines purge, proving B's purge fires under `b` more widely.

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

let journeyId
let savedModel
const buildRequest = () => journeyRequest(journeyId)
const seed = (answers) => records.saveAnswers(journeyId, answers)
const durable = async () => (await records.load({ journeyId })).answers

describe('commit — dual-pathed purge authority under MODEL', () => {
  beforeEach(async () => {
    savedModel = process.env.MODEL
    configureRecords(recordsStub)
    configureSession(sessionStub)
    await records.clear()
    configureReadyForCheckYourAnswers(() => false)
    journeyId = (await records.create()).journeyId
  })

  afterEach(() => {
    if (savedModel === undefined) delete process.env.MODEL
    else process.env.MODEL = savedModel
  })

  it('Under MODEL=a A wipes regionOfOriginCode when its gate is answered "no"', async () => {
    process.env.MODEL = 'a'
    await seed(REGION_ANSWERED)
    const { answers } = await commit(
      buildRequest(),
      stubH(),
      TURN_REGION_GATE_OFF
    )
    expect(answers.regionOfOriginCode).toBeUndefined()
    expect((await durable()).regionOfOriginCode).toBeUndefined()
  })

  it('Under MODEL=b B wipes regionOfOriginCode too — the c-017 divergence fixed at inc-016a', async () => {
    process.env.MODEL = 'b'
    await seed(REGION_ANSWERED)
    const { answers } = await commit(
      buildRequest(),
      stubH(),
      TURN_REGION_GATE_OFF
    )
    // c-017 fixed at inc-016a: B now gates regionOfOriginCode out of scope and
    // its purge set destroys the stored value, matching A.
    expect(
      wipeSetFromB({ ...REGION_ANSWERED, ...TURN_REGION_GATE_OFF })
    ).toContain('regionOfOriginCode')
    expect(answers.regionOfOriginCode).toBeUndefined()
    expect((await durable()).regionOfOriginCode).toBeUndefined()
  })

  it("Under MODEL=b commit's destroyed set equals B's evaluator purge", async () => {
    process.env.MODEL = 'b'
    await seed(PURPOSE_ANSWERED)
    const merged = { ...PURPOSE_ANSWERED, ...TURN_PURPOSE_GATE_OFF }
    const expectedWipe = wipeSetFromB(merged)

    const { answers } = await commit(
      buildRequest(),
      stubH(),
      TURN_PURPOSE_GATE_OFF
    )

    // B purges the out-of-scope purpose, so commit destroys exactly that key.
    expect(expectedWipe).toContain('purposeInInternalMarket')
    const destroyed = Object.keys(merged).filter(
      (key) => answers[key] === undefined
    )
    expect(destroyed).toEqual(expectedWipe)
    expect(answers.reasonForImport).toBe('research')
  })
})
