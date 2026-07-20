import { obligations } from './model/obligations/obligations.js'
import { domain } from './model/domain/index.js'
import { assertNoDisplayKeys } from './model/no-display-keys.js'

// Model purity gate (Sam's ruling, PLAN §5.4: no display logic in the model).
// Runs the key-level display-key ban over the live vendored model — the
// obligations manifest and the domain map — so a `label`/`title`/`hint` etc.
// added to an obligation or domain entry fails the boot, not just the test run.
export function assertObligationPurity() {
  assertNoDisplayKeys(obligations, domain)
}
