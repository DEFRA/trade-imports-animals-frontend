/**
 * line-page-controller — the line-major generic form-page handler.
 *
 * Mirrors `page-controller.js` but scoped to a single commodity line
 * via `request.params.lineId`. Registered against URLs of the form
 * `/lines/{lineId}/{pageName}`. Renders ONE input per page (the line's
 * field), validates only that line's payload, and — on save — walks
 * to the next unfulfilled per-line page or returns to `/lines`.
 *
 * See `flow.js` for the underlying flow structure (this controller
 * still consumes the same `presentsForEach` pages; only the URL layer
 * changes).
 */

import {
  fieldsForPage,
  nextAfterForLine,
  validatePagePayload,
  findPage
} from '../contract.js'
import { readState, writeAnswer } from './state.js'
import { pageCopy, forObligation } from './presentation.js'
import { chrome } from './chrome.js'
import { t } from './i18n.js'
import { commodityLine } from '../obligations/obligations.js'

const BASE = '/prototype/eudpa-249'

function urlForNext(target) {
  if (target.kind === 'lines-list') return `${BASE}/lines`
  return `${BASE}/lines/${target.lineId}/${target.page.page}`
}

function pageTitle(page) {
  if (page.presentsForEach) {
    return forObligation(page.presentsForEach.obligation).pageTitle
  }
  if (page.presents?.length === 1) {
    return forObligation(page.presents[0].obligation).pageTitle
  }
  return pageCopy(page.page).pageTitle
}

function backLinkFor() {
  return `${BASE}/lines`
}

function lineExists(state, lineId) {
  const records = state.obligations?.[commodityLine.id]?.records ?? []
  return records.some((r) => r.fulfilmentId === lineId)
}

/** True iff the flow page's presented obligation is in scope FOR the
 *  target line. numberOfPackages is applyTo-scoped by commodity code —
 *  a line whose code is not on the whitelist has no record for
 *  numberOfPackages, and a URL like /lines/{pigLine}/number-of-packages
 *  would otherwise render an empty form + a POST that silently
 *  writes nothing. */
function obligationInScopeForLine(page, state, lineId) {
  const obligation = page.presentsForEach?.obligation
  if (!obligation) return true
  const impl = state.obligations?.[obligation.id]
  if (!impl?.inScope) return false
  const records = impl.records ?? []
  return records.some((r) => r.fulfilmentId === lineId)
}

export function makeLinePageController(page) {
  return {
    get: {
      handler(request, h) {
        const { lineId } = request.params
        const state = readState(request)
        if (!lineExists(state, lineId)) {
          return h.redirect(`${BASE}/lines`)
        }
        if (!obligationInScopeForLine(page, state, lineId)) {
          return h.redirect(`${BASE}/lines`)
        }
        const descriptors = fieldsForPage(page, state, {}, { lineId })
        return h.view('shared/page', {
          chrome: chrome(),
          layout: 'layout.njk',
          pageTitle: pageTitle(page),
          heading: pageTitle(page),
          buttonText: t('chrome.saveAndContinue'),
          fields: descriptors.map((d) => d.view),
          backLink: backLinkFor(),
          crumb: request.plugins?.crumb ?? null
        })
      }
    },
    post: {
      handler(request, h) {
        const { lineId } = request.params
        const state = readState(request)
        if (!lineExists(state, lineId)) {
          return h.redirect(`${BASE}/lines`)
        }
        if (!obligationInScopeForLine(page, state, lineId)) {
          return h.redirect(`${BASE}/lines`)
        }
        const result = validatePagePayload(page, request.payload, state, {
          lineId
        })
        if (!result.ok) {
          const descriptors = fieldsForPage(page, state, result.fieldErrors, {
            lineId
          })
          return h
            .view('shared/page', {
              chrome: chrome(),
              layout: 'layout.njk',
              pageTitle: pageTitle(page),
              heading: pageTitle(page),
              buttonText: t('chrome.saveAndContinue'),
              fields: descriptors.map((d) => d.view),
              backLink: backLinkFor(),
              errorSummary: result.errorList,
              crumb: request.plugins?.crumb ?? null
            })
            .code(400)
        }
        writeAnswer(request, result.values)
        const stateAfter = readState(request)
        const target = nextAfterForLine(page, stateAfter, lineId)
        return h.redirect(urlForNext(target))
      }
    }
  }
}

/** Find the flow page whose name matches — used by the router to build
 *  line-scoped routes. */
export function findLinePage(pageName) {
  const page = findPage(pageName)
  if (!page?.presentsForEach) return null
  return page
}
