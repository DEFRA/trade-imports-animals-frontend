import { beforeEach, describe, expect, it } from 'vitest'
import { commit } from './index.js'
import { records, configureRecords } from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { wipeSet } from '../bridge/purge.js'
import { stubH, journeyRequest } from './test-support.js'

// commit's wipe authority is B's evaluator purge (projected to A pathKeys),
// sharing A's session/journey/save layer. The region-requirement gate is the
// c-017 case: answering the requirement 'no' flips regionOfOriginCode out of
// scope and B's purge destroys the stored code. The purpose gate is a second
// case B purges, proving the purge fires widely.

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
const buildRequest = () => journeyRequest(journeyId)
const seed = (answers) => records.saveAnswers(journeyId, answers)
const durable = async () => (await records.load({ journeyId })).answers

describe('commit — B-authoritative purge', () => {
  beforeEach(async () => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    await records.clear()
    configureReadyForCheckYourAnswers(() => false)
    journeyId = (await records.create()).journeyId
  })

  it('Should wipe regionOfOriginCode when its gate is answered "no"', async () => {
    await seed(REGION_ANSWERED)
    const { answers } = await commit(
      buildRequest(),
      stubH(),
      TURN_REGION_GATE_OFF
    )
    // c-017 fixed at inc-016a: B gates regionOfOriginCode out of scope and its
    // purge set destroys the stored value.
    expect(wipeSet({ ...REGION_ANSWERED, ...TURN_REGION_GATE_OFF })).toContain(
      'regionOfOriginCode'
    )
    expect(answers.regionOfOriginCode).toBeUndefined()
    expect((await durable()).regionOfOriginCode).toBeUndefined()
  })

  it("Should destroy exactly B's evaluator purge set", async () => {
    await seed(PURPOSE_ANSWERED)
    const merged = { ...PURPOSE_ANSWERED, ...TURN_PURPOSE_GATE_OFF }
    const expectedWipe = wipeSet(merged)

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
