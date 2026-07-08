/**
 * reset — clears the session for the demo. POST-only so the browser
 * doesn't blow away state by accident.
 */

import { resetState } from '../../lib/state.js'

const BASE = '/prototype/eudpa-249'

export const resetController = {
  post: {
    handler(request, h) {
      resetState(request)
      return h.redirect(`${BASE}/task-list`)
    }
  }
}
