import { spikeA } from './spike-a/routes.js'
import { spikeB } from './spike-b/routes.js'
import { spikeC } from './spike-c/routes.js'
import { spikeD } from './spike-d/routes.js'

const open = { auth: false }

/**
 * Aggregate plugin for the STANDALONE journey-model spikes — a second copy of
 * the spikes where each model is fully self-contained and flattened (no shared
 * variant builder, no cross-spike re-use). Mounted under /prototype-standalone,
 * separate from the original /prototype tree so the two run side by side.
 *
 * Registered from src/server/router.js alongside `prototypes`, behind the same
 * features.prototypes.enabled flag. Spikes B/C/D are added here as they land.
 */
export const standalonePrototypes = {
  plugin: {
    name: 'standalone-prototypes',
    async register(server) {
      server.route([
        {
          method: 'GET',
          path: '/prototype-standalone',
          options: open,
          handler(_request, h) {
            return h.view('standalone/chooser')
          }
        }
      ])

      await server.register([spikeA, spikeB, spikeC, spikeD])
    }
  }
}
