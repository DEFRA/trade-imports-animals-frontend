import { linear } from './variants/linear.js'
import { hub } from './variants/hub.js'
import { grouped } from './variants/grouped.js'

/**
 * Option B spike — statechart. Registers all three variants under
 * `/prototype/spike-b/{linear,task-list,task-list-with-linear-tasks}`.
 */
export const spikeB = {
  plugin: {
    name: 'spike-b',
    async register(server) {
      await server.register([linear, hub, grouped])
    }
  }
}
