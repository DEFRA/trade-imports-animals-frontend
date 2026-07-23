import { answersToFulfilments } from './fulfilments.js'

/**
 * MIGRATION FACADE — remove in increment 5.
 *
 * Controllers still commit name-keyed page patches in increment 4. Until
 * feature-owned UUID bindings land, rebuild the canonical evaluator map from
 * the request-local answers projection. Callers must persist only the returned
 * fulfilments.
 */
export const migrateNameKeyedAnswersToFulfilments = (answers) =>
  answersToFulfilments(answers)
