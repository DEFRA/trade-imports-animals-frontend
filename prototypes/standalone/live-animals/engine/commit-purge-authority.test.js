import { beforeEach, describe, expect, it } from 'vitest'
import { commit } from './index.js'
import { records, configureRecords } from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { wipeSet } from '../bridge/purge.js'
import { migrateNameKeyedAnswersToFulfilments } from '../bridge/name-keyed-migration.js'
import { projectAnswers } from '../bridge/fulfilments.js'
import { stubH, journeyRequest } from './test-support.js'

// commit's wipe authority is the evaluator purge (projected to positional
// pathKeys), sharing the session/journey/save layer. The region-requirement
// gate: answering the requirement 'no' flips regionOfOriginCode out of scope
// and the purge destroys the stored code. The purpose gate is a second case
// the evaluator purges, proving the purge fires widely.

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
const seed = (answers) =>
  records.replaceFulfilment(
    journeyId,
    migrateNameKeyedAnswersToFulfilments(answers)
  )
const durable = async () =>
  projectAnswers((await records.load({ journeyId })).fulfilment)

describe('#commit — evaluator-authoritative purge', () => {
  beforeEach(async () => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    await records.clear()
    configureReadyForCheckYourAnswers(() => false)
    journeyId = (await records.create()).journeyId
  })

  it('Should retain regionOfOriginCode when its gate is answered "no" (retain-value)', async () => {
    await seed(REGION_ANSWERED)
    const { answers } = await commit(
      buildRequest(),
      stubH(),
      TURN_REGION_GATE_OFF
    )
    // Retain-value pattern: the field stays in scope (optional) on 'no',
    // so the purge never claims it and the stored value survives.
    expect(
      wipeSet({ ...REGION_ANSWERED, ...TURN_REGION_GATE_OFF })
    ).not.toContain('regionOfOriginCode')
    expect(answers.regionOfOriginCode).toBe(REGION_ANSWERED.regionOfOriginCode)
    expect((await durable()).regionOfOriginCode).toBe(
      REGION_ANSWERED.regionOfOriginCode
    )
  })

  it('Should destroy exactly the evaluator purge set', async () => {
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
