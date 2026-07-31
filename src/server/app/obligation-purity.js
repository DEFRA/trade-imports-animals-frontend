import { obligations } from './model/obligations/obligations.js'
import { assertNoDisplayKeys } from './model/no-display-keys.js'

// Model purity gate: no display logic in the model. A boot-time check over the
// live model — no `label`/`title`/`hint` etc. on any obligation.

export const assertObligationPurity = () => {
  assertNoDisplayKeys(obligations)
}
