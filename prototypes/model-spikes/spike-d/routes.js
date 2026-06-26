import { contract } from './runtime/contract.js'
import { buildVariant } from '../shared/variant.js'

const grouped = buildVariant({
  slug: 'spike-d',
  shapeName: 'grouped',
  contract
})

/**
 * Option D spike — schema-first (JSON Schema). Registers the variant
 * under `/prototype/spike-d/task-list-with-linear-tasks`.
 */
export const spikeD = {
  plugin: {
    name: 'spike-d',
    async register(server) {
      await server.register([grouped])
    }
  }
}
