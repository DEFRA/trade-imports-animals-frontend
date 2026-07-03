import { randomUUID } from 'node:crypto'

/**
 * Graft 4 — the enforced determinism seam (FULF-7/8/9, DEF-3, DEF-14).
 * The SOLE minting point for opaque user-source fulfilment ids: the
 * orchestrator mints one stable id per added row (a claim) and both
 * evaluators only ever read ids back from stored keys or controller
 * answer values. Importable only by orchestrator/* — the import-ban test
 * greps the spike tree, and a sibling test asserts evaluator output never
 * embeds a freshly minted id (EVAL-17).
 */

/** Mint one opaque, stable fulfilment id for a user-source indexed row. */
export const mintFulfilmentId = () => `f-${randomUUID()}`
