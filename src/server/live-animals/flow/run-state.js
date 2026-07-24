import { session } from '../engine/persistence/session.js'

export const RUN_ACTIVE = 'active'
export const RUN_COMPLETE = 'complete'

// Session-side presentation state keyed by journey id for the opening run —
// never canonical fulfilment data (see docs/flow-and-gates.md).

export const beginOpeningRun = async (request, h, journeyId) =>
  session.setOpeningRun(h, journeyId, RUN_ACTIVE, request)

export const completeOpeningRun = async (request, h, journeyId) => {
  if ((await session.openingRun(request, journeyId)) !== RUN_ACTIVE) return
  await session.setOpeningRun(h, journeyId, RUN_COMPLETE, request)
}

export const inOpeningRun = async (request, journeyId) =>
  (await session.openingRun(request, journeyId)) === RUN_ACTIVE

export const hasEnteredThroughFilter = async (request, journeyId) =>
  (await session.openingRun(request, journeyId)) !== undefined
