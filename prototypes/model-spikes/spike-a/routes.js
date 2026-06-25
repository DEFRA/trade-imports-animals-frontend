import { linear } from './variants/linear.js'
import { hub } from './variants/hub.js'
import { grouped } from './variants/grouped.js'

/**
 * Option A spike — registers all three variants under
 * `/prototype/spike-a/{linear,task-list,task-list-with-linear-tasks}`. Added to
 * the `/prototype` chooser by prototypes/index.js.
 */
export const spikeA = {
  plugin: {
    name: 'spike-a',
    async register(server) {
      await server.register([linear, hub, grouped])
    }
  }
}
