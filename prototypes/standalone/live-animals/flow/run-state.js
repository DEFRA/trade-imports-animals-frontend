import { session } from '../engine/persistence/session.js'
import { currentJourney } from '../engine/journey.js'

export const RUN_ACTIVE = 'active'
export const RUN_COMPLETE = 'complete'

// Session-side presentation state `{ journeyId, phase }` for the opening
// run — never notification data (see docs/flow-and-gates.md). Shared shape
// read/written by all four exports below.

export const beginOpeningRun = async (request, h) => {
  const { journeyId } = await currentJourney(request, h)
  await session.setOpeningRun(h, { journeyId, phase: RUN_ACTIVE })
}

export const completeOpeningRun = async (request, h) => {
  const record = await session.openingRun(request)
  if (record?.phase !== RUN_ACTIVE) return
  await session.setOpeningRun(h, { ...record, phase: RUN_COMPLETE })
}

export const inOpeningRun = async (request) => {
  const record = await session.openingRun(request)
  if (record?.phase !== RUN_ACTIVE) return false
  return record.journeyId === (await session.activeJourneyId(request))
}

export const hasEnteredThroughFilter = async (request, journeyId) => {
  const record = await session.openingRun(request)
  return record?.journeyId === journeyId
}
