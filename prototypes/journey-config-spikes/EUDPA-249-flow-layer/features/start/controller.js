/**
 * start — the landing route. Redirects to the first unfulfilled page
 * (or the first applicable page if the journey is already F).
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
      return h.redirect(`${BASE}/pages/${first.page}`)
    }
  }
}
