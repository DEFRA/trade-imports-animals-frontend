import { contract } from './runtime/contract.js'
import { buildVariant } from '../shared/variant.js'

const grouped = buildVariant({
  slug: 'spike-c',
  shapeName: 'grouped',
  contract
})

/**
 * Option C spike — requirement-graph rules engine. Registers the variant
 * under `/prototype/spike-c/task-list-with-linear-tasks`.
 */
export const spikeC = {
  plugin: {
    name: 'spike-c',
    async register(server) {
      await server.register([grouped])
    }
  }
}
