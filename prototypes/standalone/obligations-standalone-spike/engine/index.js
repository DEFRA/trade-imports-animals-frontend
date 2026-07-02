/**
 * Graft 8 — the doc-shaped engine barrel. The one-call ObligationEvaluator,
 * `evaluateObligations(obligations, fulfilments) -> EvaluationResult`
 * (obligations.md:262-322), plus the plain primitives interrogation
 * Level 1 exposes: identifiers, prune, reasons, mandates, model loading
 * and the scope registry. Everything here is pure and sync — all I/O and
 * id minting live in the orchestrator.
 */

export { evaluateObligations } from './evaluate.js'
export { pruneFulfilments } from './prune.js'
export { createIdentifierIndex } from './identifiers.js'
export { reason, reasonCodes, humaniseName, scopeAnswered } from './reasons.js'
export {
  MANDATE_COMPOSITION,
  composeMandate,
  blocksSave,
  unfulfilledMandatory,
  COMPLETION_POLICIES,
  JOURNEY_COMPLETION_POLICY,
  resolveCompletionPolicy
} from './mandates.js'
export { loadModel, loadJourneyModel, typeCompanions } from './load-model.js'
export {
  createScopeRegistry,
  journeyScopeRegistry,
  createJourneyScopeRegistry,
  ENGINE_MANDATORY_ALWAYS,
  demos
} from './scope/index.js'
