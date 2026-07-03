import { coverType } from '../cover-type/obligations.js'

/**
 * Your quote — the one `system` obligation this feature owns: `premium`. Pure
 * data; the only import is sideways, to `coverType` (the answer that brings
 * the premium into scope). Computed on demand, never collected — the commit
 * contract test excludes it via the `system` flag, and the boot coverage
 * assertion skips `system` obligations (no page collects them).
 */
export const premium = {
  id: 'premium',
  system: true,
  activatedBy: { obligation: coverType, present: true }
}

export const defs = [premium]
