import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { commit, submitJourney } from './index.js'
import {
  records,
  configureRecords,
  IN_PROGRESS,
  SUBMITTED
} from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { stubH, journeyRequest } from './test-support.js'

// inc-016 — submitJourney under MODEL=b. No new dual-pathing: submit reads its
// scope through the inc-012 `makeScope` dispatcher (B-derived under `b`) and
// gates on that scope's `readyForCheckYourAnswers`. Under `b` that flag still
// delegates to A's boot-injected fn (makeScopeFromB → makeScopeA), because
// migrating readiness to B's journeyState/containerStatus is inc-017a's job —
// the whole status/flow class moves together there. `records.finalise` is A's
// persistence under both flags (B has none). These tests confirm submit
// finalises the journey by its journeyId when CYA-ready and blocks when not,
// under `b`. Env hygiene: process.env.MODEL is saved/restored so the flag never
// leaks into a reused worker process.

let journeyId
let savedModel
const buildRequest = () => journeyRequest(journeyId)

describe('submitJourney under MODEL=b — B-derived scope gate, A finalise', () => {
  beforeEach(async () => {
    savedModel = process.env.MODEL
    process.env.MODEL = 'b'
    configureRecords(recordsStub)
    configureSession(sessionStub)
    await records.clear()
    journeyId = (await records.create()).journeyId
  })
  afterEach(() => {
    if (savedModel === undefined) delete process.env.MODEL
    else process.env.MODEL = savedModel
  })

  it('Should finalise the CYA-ready journey by its journeyId under b', async () => {
    configureReadyForCheckYourAnswers(() => true)
    await commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })

    const result = await submitJourney(buildRequest(), stubH())

    expect(result.ok).toBe(true)
    // finalise ran with this journeyId — its record is the one flipped.
    expect(result.journey.journeyId).toBe(journeyId)
    expect(result.journey.status).toBe(SUBMITTED)
    expect((await records.load({ journeyId })).status).toBe(SUBMITTED)
  })

  it('Should return { ok: false } and leave the journey in-progress when not CYA-ready under b', async () => {
    configureReadyForCheckYourAnswers(() => false)
    await commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })

    const result = await submitJourney(buildRequest(), stubH())

    expect(result.ok).toBe(false)
    expect((await records.load({ journeyId })).status).toBe(IN_PROGRESS)
  })
})
