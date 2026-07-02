/**
 * The scope folder-module. Journey scoping lives in journey-rules; the
 * graft-5 expressiveness demos are namespaced under `demos` and are never
 * registered against journey obligations.
 */
export { createScopeRegistry } from './registry.js'
export {
  journeyScopeRegistry,
  createJourneyScopeRegistry,
  ENGINE_MANDATORY_ALWAYS
} from './journey-rules.js'
export * as demos from './expressiveness.js'
