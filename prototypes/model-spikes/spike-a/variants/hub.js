import { contract } from '../runtime/selectors.js'
import { buildVariant } from '../../shared/variant.js'

// Hub (task-list) shape — every section returns to the per-quote hub.
export const hub = buildVariant({
  slug: 'spike-a',
  shapeName: 'hub',
  contract
})
