import { assembleFeature } from './fulfilment-bindings.js'
import { fulfilmentRegistry } from './fulfilment-registry.js'

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

export const assembleFulfilments = (
  answers = {},
  registry = fulfilmentRegistry
) => {
  const merged = {}
  for (const feature of registry.features) {
    const contribution = assembleFeature(feature, answers)
    for (const [obligationId, value] of Object.entries(contribution)) {
      if (hasOwn(merged, obligationId)) {
        throw new Error(
          `Duplicate fulfilment contribution for obligation ${obligationId}`
        )
      }
      merged[obligationId] = value
    }
  }

  return Object.fromEntries(
    registry.leaves
      .filter((obligation) => hasOwn(merged, obligation.id))
      .map((obligation) => [obligation.id, merged[obligation.id]])
  )
}
