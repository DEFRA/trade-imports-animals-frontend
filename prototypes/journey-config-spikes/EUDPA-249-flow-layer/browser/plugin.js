/**
 * Hapi plugin — mounts the EUDPA-249 browsable prototype under
 * /prototype/eudpa-249/*.
 *
 * Routes are generated at register-time by walking flow.js and emitting
 * one GET+POST per static page, plus the bespoke line / lookup / start /
 * reset / hub / cya routes.
 *
 * The plugin is registered only when
 * `config.get('prototype.eudpa249.enabled')` is true — see
 * src/server/router.js.
 */

import { pages } from './contract.js'
import { makePageController } from './page-controller.js'
import { hubController } from './hub-controller.js'
import { cyaController } from './cya-controller.js'
import {
  linesIndexController,
  linesAddController,
  linesDeleteController
} from './line-controllers.js'
import {
  startController,
  resetController,
  lookupController
} from './misc-controllers.js'

const BASE = '/prototype/eudpa-249'

function hasPresentsForEach(page) {
  return Boolean(page.presentsForEach)
}

export const journeyConfigFlow = {
  plugin: {
    name: 'journey-config-flow-eudpa-249',
    register(server) {
      const routes = []

      // Navigation / meta routes
      routes.push({
        method: 'GET',
        path: `${BASE}/start`,
        ...startController.get
      })
      routes.push({
        method: 'GET',
        path: `${BASE}/task-list`,
        ...hubController.get
      })
      routes.push({
        method: 'GET',
        path: `${BASE}/check-your-answers`,
        ...cyaController.get
      })
      routes.push({
        method: 'POST',
        path: `${BASE}/reset`,
        ...resetController.post
      })

      // Seeded async lookup
      routes.push({
        method: 'GET',
        path: `${BASE}/pages/animals-certified-for/resolve`,
        ...lookupController.get
      })

      // Commodity-lines index / add / delete (bespoke)
      routes.push({
        method: 'GET',
        path: `${BASE}/lines`,
        ...linesIndexController.get
      })
      routes.push({
        method: 'POST',
        path: `${BASE}/lines/add`,
        ...linesAddController.post
      })
      routes.push({
        method: 'POST',
        path: `${BASE}/lines/{id}/delete`,
        ...linesDeleteController.post
      })

      // Flow-driven pages — one GET + POST per page that presents
      // top-level obligations. Pages with presentsForEach (per-line
      // pages) and read-only intro pages are skipped in v1: the hub
      // routes users into the bespoke /lines controller instead.
      for (const page of pages()) {
        if (hasPresentsForEach(page)) continue
        if (!page.presents || page.presents.length === 0) continue
        const handlers = makePageController(page)
        routes.push({
          method: 'GET',
          path: `${BASE}/pages/${page.page}`,
          ...handlers.get
        })
        routes.push({
          method: 'POST',
          path: `${BASE}/pages/${page.page}`,
          ...handlers.post
        })
      }

      server.route(routes)
    }
  }
}
