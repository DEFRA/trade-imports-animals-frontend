import { session } from '../engine/persistence/session.js'

export const RUN_ACTIVE = 'active'
export const RUN_COMPLETE = 'complete'

export const RUN_ENTRY_START = 'start'
export const RUN_ENTRY_LIST_CREATE = 'list-create'

export const beginOpeningRun = async (request, h, journeyId, { entry }) => {
  await session.setOpeningRun(h, journeyId, RUN_ACTIVE, request)
  await session.setOpeningRunEntry(h, journeyId, entry, request)
}

export const completeOpeningRun = async (request, h, journeyId) => {
  if ((await session.openingRun(request, journeyId)) !== RUN_ACTIVE) {
    return
  }
  await session.setOpeningRun(h, journeyId, RUN_COMPLETE, request)
}

export const inOpeningRun = async (request, journeyId) =>
  (await session.openingRun(request, journeyId)) === RUN_ACTIVE

export const activeOpeningRunBeganAtStartEntry = async (request, journeyId) =>
  (await inOpeningRun(request, journeyId)) &&
  (await session.openingRunEntry(request, journeyId)) === RUN_ENTRY_START

/** Whether the opening run has ever begun for this journey — active or
 * complete. */
export const openingRunStarted = async (request, journeyId) =>
  (await session.openingRun(request, journeyId)) !== undefined
