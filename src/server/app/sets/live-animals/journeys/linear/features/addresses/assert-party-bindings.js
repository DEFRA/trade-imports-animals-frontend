import { evaluationBindings as addressesBindings } from './evaluation.js'

/**
 * Throws when an addresses binding is not scalar: party fulfilment ids are
 * defined for scalar bindings only.
 */
export const assertPartyBindingsAreScalar = () => {
  for (const binding of addressesBindings.bindings) {
    if (binding.kind !== 'scalar') {
      throw new Error(
        `Party fulfilment mapping only supports scalar bindings; ${binding.field} is ${binding.kind}`
      )
    }
  }
}
