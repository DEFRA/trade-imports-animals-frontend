import { createJourneyRepository } from './journey-repository.js'

/**
 * Barrel for the store folder-module: the factory plus the app-level
 * singleton repository every production caller shares (the journey-context
 * seam and the orchestrator). Tests build their own instances.
 */
export {
  createJourneyRepository,
  IN_PROGRESS,
  SUBMITTED
} from './journey-repository.js'

/** The app-level singleton — one in-memory store per process. */
export const journeyRepository = createJourneyRepository()
