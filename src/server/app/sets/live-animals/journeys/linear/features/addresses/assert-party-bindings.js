import { evaluationBindings as addressesBindings } from './evaluation.js'
import { evaluationBindings as contactBindings } from '../contact/evaluation.js'

/**
 * Party fulfilment ids are only defined for scalar bindings today.
 * Indexed or grouped party bindings would need write-side generalisation
 * (answerFor, state.commit nested paths) and a documented composite wire
 * format before this map can cover them — see EUDPA-333 review discussion.
 */
export const assertPartyBindingsAreScalar = () => {
  for (const binding of [
    ...addressesBindings.bindings,
    ...contactBindings.bindings
  ]) {
    if (binding.kind !== 'scalar') {
      throw new Error(
        `Party fulfilment mapping only supports scalar bindings; ${binding.field} is ${binding.kind}`
      )
    }
  }
}
