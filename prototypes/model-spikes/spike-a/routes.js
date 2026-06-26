import { contract } from './runtime/selectors.js'
import { buildVariant } from '../shared/variant.js'

const grouped = buildVariant({
  slug: 'spike-a',
  shapeName: 'grouped',
  contract
})

/**
 * Option A spike — registers the variant under
 * `/prototype/spike-a/task-list-with-linear-tasks`. Added to the `/prototype`
 * chooser by prototypes/index.js.
 */
export const spikeA = {
  plugin: {
    name: 'spike-a',
    async register(server) {
      await server.register([grouped])
    }
  }
}
