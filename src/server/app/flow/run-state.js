import { session } from '../engine/persistence/session.js'

export const RUN_ACTIVE = 'active'
export const RUN_COMPLETE = 'complete'

// Session-side presentation state keyed by journey id for the opening run —
// never canonical fulfilment data (see docs/flow-and-gates.md).

export const beginOpeningRun = async (request, h, journeyId) =>
  session.setOpeningRun(h, journeyId, RUN_ACTIVE, request)

export const completeOpeningRun = async (request, h, journeyId) => {
  if ((await session.openingRun(request, journeyId)) !== RUN_ACTIVE) {
    return
  }
  await session.setOpeningRun(h, journeyId, RUN_COMPLETE, request)
}

export const inOpeningRun = async (request, journeyId) =>
  (await session.openingRun(request, journeyId)) === RUN_ACTIVE

/** Whether the opening run has ever begun for this journey — active or
 * complete. A journey with no record was never entered through the journey
 * entry. */
export const openingRunStarted = async (request, journeyId) =>
  (await session.openingRun(request, journeyId)) !== undefined
