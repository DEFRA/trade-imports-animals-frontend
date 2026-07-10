/**
 * start — the landing route. Redirects to the first unfulfilled page
 * (or the first applicable page if the journey is already F).
 *
 * `presentsForEach` pages are only registered at
 * `/lines/{lineId}/{page}` — flow-major URLs no longer exist for them.
 * When `startPage` returns one, redirect to `/lines` so the user picks
 * a line rather than getting a 404.
 */

import { startPage } from '../../contract.js'
import { readState } from '../../lib/state.js'

const BASE = '/prototype/eudpa-249'

export const startController = {
  get: {
    handler(request, h) {
      const state = readState(request)
      const first = startPage(state)
      if (!first) return h.redirect(`${BASE}/task-list`)
      if (first.presentsForEach) return h.redirect(`${BASE}/lines`)
      return h.redirect(`${BASE}/pages/${first.page}`)
    }
  }
}
