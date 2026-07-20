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
import { unitRecord, accompanyingDocument } from './obligations/obligations.js'
import { makePageController } from './lib/page-controller.js'
import { makeLinePageController } from './lib/line-page-controller.js'
import { makeUnitPageController } from './lib/unit-page-controller.js'
import { makeAccompanyingDocPageController } from './lib/accompanying-doc-page-controller.js'
import { hubController } from './features/hub/controller.js'
import { cyaController } from './features/check-your-answers/controller.js'
import {
  linesIndexController,
  linesAddController,
  linesDeleteController
} from './features/commodity-lines/controller.js'
import {
  linesUnitsIndexController,
  linesUnitsAddController,
  linesUnitsDeleteController
} from './features/units/controller.js'
import {
  accompanyingDocumentsIndexController,
  accompanyingDocumentsAddController,
  accompanyingDocumentsDeleteController
} from './features/accompanying-documents/controller.js'
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

      // Accompanying-documents index / add / delete (bespoke, WS4 —
      // 0..10 documents per notification).
      routes.push(
        publicRoute({
          method: 'GET',
          path: `${BASE}/accompanying-documents`,
          ...accompanyingDocumentsIndexController.get
        })
      )
      routes.push(
        publicRoute({
          method: 'POST',
          path: `${BASE}/accompanying-documents/add`,
          ...accompanyingDocumentsAddController.post
        })
      )
      routes.push(
        publicRoute({
          method: 'POST',
          path: `${BASE}/accompanying-documents/{id}/delete`,
          ...accompanyingDocumentsDeleteController.post
        })
      )

      // Per-line units index / add / delete (bespoke, depth-2).
      routes.push(
        publicRoute({
          method: 'GET',
          path: `${BASE}/lines/{lineId}/units`,
          ...linesUnitsIndexController.get
        })
      )
      routes.push(
        publicRoute({
          method: 'POST',
          path: `${BASE}/lines/{lineId}/units/add`,
          ...linesUnitsAddController.post
        })
      )
      routes.push(
        publicRoute({
          method: 'POST',
          path: `${BASE}/lines/{lineId}/units/{unitId}/delete`,
          ...linesUnitsDeleteController.post
        })
      )

      // Flow-driven pages.
      //
      //   Static `presents` pages → one GET + POST at `/pages/{name}`
      //     via the generic page controller.
      //   `presentsForEach` pages fan out by `forEachOf`:
      //     - `forEachOf: commodityLine` → `/lines/{lineId}/{name}`
      //       via the line-scoped page controller.
      //     - `forEachOf: unitRecord`   → `/lines/{lineId}/units/{unitId}/{name}`
      //       via the unit-scoped page controller (depth-2 fan-out).
      //   The user reaches these by clicking into a specific line
      //   from `/lines`, or a specific unit from `/lines/{lineId}/units`.
      //   The flow-major "all instances on one page" URL is no longer
      //   registered for either level.
      //
      // Read-only intro pages (no presents, no presentsForEach) are
      // skipped entirely.
      for (const page of pages()) {
        const hasPresents = page.presents && page.presents.length > 0
        const isForEach = hasPresentsForEach(page)
        if (isForEach) {
          if (page.presentsForEach.forEachOf === unitRecord) {
            const handlers = makeUnitPageController(page)
            routes.push(
              publicRoute({
                method: 'GET',
                path: `${BASE}/lines/{lineId}/units/{unitId}/${page.page}`,
                ...handlers.get
              })
            )
            routes.push(
              publicRoute({
                method: 'POST',
                path: `${BASE}/lines/{lineId}/units/{unitId}/${page.page}`,
                ...handlers.post
              })
            )
            continue
          }
          if (page.presentsForEach.forEachOf === accompanyingDocument) {
            const handlers = makeAccompanyingDocPageController(page)
            routes.push(
              publicRoute({
                method: 'GET',
                path: `${BASE}/accompanying-documents/{docId}/${page.page}`,
                ...handlers.get
              })
            )
            routes.push(
              publicRoute({
                method: 'POST',
                path: `${BASE}/accompanying-documents/{docId}/${page.page}`,
                ...handlers.post
              })
            )
            continue
          }
          const handlers = makeLinePageController(page)
          routes.push(
            publicRoute({
              method: 'GET',
              path: `${BASE}/lines/{lineId}/${page.page}`,
              ...handlers.get
            })
          )
          routes.push(
            publicRoute({
              method: 'POST',
              path: `${BASE}/lines/{lineId}/${page.page}`,
              ...handlers.post
            })
          )
          continue
        }
        if (!hasPresents) continue
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
