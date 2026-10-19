import { evaluationBindings as addressesBindings } from './evaluation.js'
import { evaluationBindings as contactBindings } from '../contact/evaluation.js'

/**
 * Throws when an addresses or contact binding is not scalar: party fulfilment
 * ids are defined for scalar bindings only.
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
