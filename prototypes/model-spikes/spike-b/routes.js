import { contract } from './runtime/contract.js'
import { buildVariant } from '../shared/variant.js'

const grouped = buildVariant({
  slug: 'spike-b',
  shapeName: 'grouped',
  contract
})

/**
 * Option B spike — statechart. Registers the variant under
 * `/prototype/spike-b/task-list-with-linear-tasks`.
 */
export const spikeB = {
  plugin: {
    name: 'spike-b',
    async register(server) {
      await server.register([grouped])
    }
  }
}
