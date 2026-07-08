/**
 * Hapi plugin — mounts the EUDPA-249 browsable prototype under
 * /prototype/eudpa-249/*.
 *
 * Routes are generated at register-time by walking flow.js and emitting
 * one GET+POST per static page, plus the bespoke line / start / reset /
 * hub / cya routes.
 *
 * The plugin is registered only when
 * `config.get('prototype.eudpa249.enabled')` is true — see
 * src/server/router.js.
 */

import { pages } from './contract.js'
import { makePageController } from './lib/page-controller.js'
import { hubController } from './features/hub/controller.js'
import { cyaController } from './features/check-your-answers/controller.js'
import {
  linesIndexController,
  linesAddController,
  linesDeleteController
} from './features/commodity-lines/controller.js'
import { startController } from './features/start/controller.js'
import { resetController } from './features/reset/controller.js'

const BASE = '/prototype/eudpa-249'

function hasPresentsForEach(page) {
  return Boolean(page.presentsForEach)
}

// The prototype is public — it's a demo, not a live service. When the
// host frontend has auth on (server.auth.default('session') in
// plugins/auth.js), every route gets a session strategy by default and
// unauthenticated hits redirect to sign-in. `auth: false` opts our
// prototype routes out so a stakeholder can click through without a
// login. If the host runs `AUTH_ENABLED=false`, this setting is a no-op.
const PUBLIC = { auth: false }

function publicRoute(route) {
  return { ...route, options: { ...(route.options ?? {}), ...PUBLIC } }
}

export const journeyConfigFlow = {
  plugin: {
    name: 'journey-config-flow-eudpa-249',
    register(server) {
      const routes = []

      // Navigation / meta routes
      routes.push(
        publicRoute({
          method: 'GET',
          path: `${BASE}/start`,
          ...startController.get
        })
      )
      routes.push(
        publicRoute({
          method: 'GET',
          path: `${BASE}/task-list`,
          ...hubController.get
        })
      )
      routes.push(
        publicRoute({
          method: 'GET',
          path: `${BASE}/check-your-answers`,
          ...cyaController.get
        })
      )
      routes.push(
        publicRoute({
          method: 'POST',
          path: `${BASE}/reset`,
          ...resetController.post
        })
      )

      // Commodity-lines index / add / delete (bespoke)
      routes.push(
        publicRoute({
          method: 'GET',
          path: `${BASE}/lines`,
          ...linesIndexController.get
        })
      )
      routes.push(
        publicRoute({
          method: 'POST',
          path: `${BASE}/lines/add`,
          ...linesAddController.post
        })
      )
      routes.push(
        publicRoute({
          method: 'POST',
          path: `${BASE}/lines/{id}/delete`,
          ...linesDeleteController.post
        })
      )

      // Flow-driven pages — one GET + POST per page. Pages with
      // `presentsForEach` fan out to one field per in-scope commodity
      // line on the same page (single URL for all lines). Read-only
      // intro pages (no presents, no presentsForEach) are skipped.
      for (const page of pages()) {
        const hasPresents = page.presents && page.presents.length > 0
        const isForEach = hasPresentsForEach(page)
        if (!hasPresents && !isForEach) continue
        const handlers = makePageController(page)
        routes.push(
          publicRoute({
            method: 'GET',
            path: `${BASE}/pages/${page.page}`,
            ...handlers.get
          })
        )
        routes.push(
          publicRoute({
            method: 'POST',
            path: `${BASE}/pages/${page.page}`,
            ...handlers.post
          })
        )
      }

      server.route(routes)
    }
  }
}
