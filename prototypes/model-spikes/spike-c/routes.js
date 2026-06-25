import { linear } from './variants/linear.js'
import { hub } from './variants/hub.js'
import { grouped } from './variants/grouped.js'

/**
 * Option C spike — requirement-graph rules engine. Registers all three variants
 * under `/prototype/spike-c/{linear,task-list,task-list-with-linear-tasks}`.
 */
export const spikeC = {
  plugin: {
    name: 'spike-c',
    async register(server) {
      await server.register([linear, hub, grouped])
    }
  }
}
