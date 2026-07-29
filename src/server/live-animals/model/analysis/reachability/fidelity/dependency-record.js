import { obligationMetadata } from '../../../obligations/helpers/index.js'

// Prefer the derived-or-declared dependsOn from `obligationMetadata` —
// meta-first helpers name their gate obligation on `.metadata`, so the
// dependency graph is recoverable without an explicit `dependsOn`
// declaration.
export const dependencyRecordFor = (obligation) =>
  typeof obligation.applyTo === 'function'
    ? {
        id: obligation.id,
        dependsOn: obligationMetadata(obligation).dependsOn
      }
    : { id: obligation.id, dependsOn: [] }
