import { contract } from '../runtime/contract.js'
import { buildVariant } from '../../shared/variant.js'

export const linear = buildVariant({
  slug: 'spike-d',
  shapeName: 'linear',
  contract
})
