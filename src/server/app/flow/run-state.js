import { session } from '../engine/persistence/session.js'

export const RUN_ACTIVE = 'active'
export const RUN_COMPLETE = 'complete'

export const beginOpeningRun = async (request, h, journeyId) => {
  await session.setOpeningRun(h, journeyId, RUN_ACTIVE, request)
}

export const completeOpeningRun = async (request, h, journeyId) => {
  if ((await session.openingRun(request, journeyId)) !== RUN_ACTIVE) {
    return
  }
  await session.setOpeningRun(h, journeyId, RUN_COMPLETE, request)
}
