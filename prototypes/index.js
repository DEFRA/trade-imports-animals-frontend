import { listQuotes } from './shared/store.js'
import { coverTypeLabel } from './shared/quote.js'
import { linearPrototype } from './linear/index.js'
import { taskListPrototype } from './task-list/index.js'
import { taskListWithLinearTasksPrototype } from './task-list-with-linear-tasks/index.js'
import { spikeA } from './model-spikes/spike-a/routes.js'

const open = { auth: false }

/**
 * Aggregate plugin for the throwaway car insurance prototypes. Registers a
 * chooser landing page, a saved-quotes view, and each journey variant.
 * Registered from src/server/router.js only when prototypes are enabled.
 */
export const prototypes = {
  plugin: {
    name: 'prototypes',
    async register(server) {
      server.route([
        {
          method: 'GET',
          path: '/prototype',
          options: open,
          handler(_request, h) {
            return h.view('chooser')
          }
        },
        {
          method: 'GET',
          path: '/prototype/quotes',
          options: open,
          handler(_request, h) {
            const rows = listQuotes().map((quote) => [
              { text: quote.reference ?? '(draft)' },
              { text: quote.variant ?? '—' },
              { text: quote.fullName ?? '—' },
              { text: coverTypeLabel(quote.coverType) },
              { text: quote.premium ? `£${quote.premium}` : '—' },
              { text: quote.status }
            ])
            return h.view('quotes', { rows })
          }
        }
      ])

      await server.register([
        linearPrototype,
        taskListPrototype,
        taskListWithLinearTasksPrototype,
        // Journey-model spikes — each registers its own three variants under
        // /prototype/spike-<slug>/... so they run side by side with the above.
        spikeA
      ])
    }
  }
}
