import { contract } from '../runtime/selectors.js'
import { buildVariant } from '../../shared/variant.js'

// Grouped (task-list-with-linear-tasks) shape — sections run linearly within a
// task group, then return to the hub.
export const grouped = buildVariant({
  slug: 'spike-a',
  shapeName: 'grouped',
  contract
})
