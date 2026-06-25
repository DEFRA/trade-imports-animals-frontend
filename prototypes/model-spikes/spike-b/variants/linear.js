import { contract } from '../runtime/contract.js'
import { buildVariant } from '../../shared/variant.js'

export const linear = buildVariant({
  slug: 'spike-b',
  shapeName: 'linear',
  contract
})
