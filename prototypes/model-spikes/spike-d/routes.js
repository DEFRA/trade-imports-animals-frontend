import { linear } from './variants/linear.js'
import { hub } from './variants/hub.js'
import { grouped } from './variants/grouped.js'

/**
 * Option D spike — schema-first (JSON Schema). Registers all three variants
 * under `/prototype/spike-d/{linear,task-list,task-list-with-linear-tasks}`.
 */
export const spikeD = {
  plugin: {
    name: 'spike-d',
    async register(server) {
      await server.register([linear, hub, grouped])
    }
  }
}
