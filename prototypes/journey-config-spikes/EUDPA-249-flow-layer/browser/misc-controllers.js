/**
 * Small one-shot handlers: start (redirect landing), reset (clear
 * session), and the seeded async lookup.
 */

import { startPage } from './contract.js'
import {
  readState,
  resetState,
  isLookupSeeded,
  markLookupSeeded,
  writeAnswer
} from './state.js'
import { certifiedForOptionsLookup } from '../domain.js'

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

export const resetController = {
  post: {
    handler(request, h) {
      resetState(request)
      return h.redirect(`${BASE}/task-list`)
    }
  }
}

/**
 * Seeded async lookup — simulates the orchestrator resolving the
 * `certifiedForOptionsLookup` obligation. First hit writes a fake
 * result and redirects back to the page; subsequent hits pass through
 * to the animals-certified-for form.
 */
const FAKE_CERTIFIED_FOR_OPTIONS = ['bovine', 'ovine', 'porcine', 'equine']

export const lookupController = {
  get: {
    handler(request, h) {
      if (!isLookupSeeded(request)) {
        writeAnswer(request, {
          [certifiedForOptionsLookup.name]: {
            obligation: certifiedForOptionsLookup,
            path: null,
            value: FAKE_CERTIFIED_FOR_OPTIONS
          }
        })
        markLookupSeeded(request)
      }
      return h.redirect(`${BASE}/pages/animals-certified-for`)
    }
  }
}
