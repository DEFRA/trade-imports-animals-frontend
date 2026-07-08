/**
 * Seeded async lookup — simulates the orchestrator resolving the
 * `certifiedForOptionsLookup` obligation. First hit writes a fake
 * result and redirects back to the page; subsequent hits pass through
 * to the animals-certified-for form.
 */

import {
  isLookupSeeded,
  markLookupSeeded,
  writeAnswer
} from '../../lib/state.js'
import { certifiedForOptionsLookup } from '../../domain/index.js'

const BASE = '/prototype/eudpa-249'

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
