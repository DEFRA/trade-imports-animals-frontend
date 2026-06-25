import { contract } from '../runtime/selectors.js'
import { buildVariant } from '../../shared/variant.js'

// Thin wiring: the linear journey is the model driven with a `{ kind: 'linear' }`
// shape. All flow/status/validation comes from the contract.
export const linear = buildVariant({
  slug: 'spike-a',
  shapeName: 'linear',
  contract
})
