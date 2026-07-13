/**
 * page-controller — the generic form-page handler. One instance handles
 * every static (non-line) page in flow.js.
 *
 * GET  — reads state, builds field descriptors, renders `page.njk`.
 * POST — validates via contract.validatePagePayload; on error re-renders
 *        with error summary + field errors; on pass writes fulfilments
 *        and redirects to nextAfter().
 *
 * The controller factory takes a `page` object (a flow.js page node) and
 * closes over it.
 */

import {
  fieldsForPage,
  nextAfter,
  validatePagePayload,
  findPage
} from '../contract.js'
import { readState, writeAnswer } from './state.js'
import { pageCopy, forObligation } from './presentation.js'
import { chrome } from './chrome.js'
import { t } from './i18n.js'

const BASE = '/prototype/eudpa-249'

function urlForNext(target, opts = {}) {
  if (target.kind === 'task-list') return `${BASE}/task-list`
  return `${BASE}/pages/${target.page.page}${opts.query ?? ''}`
}

function pageTitle(page) {
  if (page.presents?.length === 1) {
    const only = page.presents[0].obligation
    return forObligation(only).pageTitle
  }
  const copy = pageCopy(page.page)
  return copy.pageTitle
}

function backLinkFor(page) {
  // Best-effort: link back to the task list. Real breadcrumb / prev-page
  // navigation is a follow-on.
  return `${BASE}/task-list`
}

export function makePageController(page) {
  return {
    get: {
      handler(request, h) {
        const state = readState(request)
        const descriptors = fieldsForPage(page, state)
        return h.view('shared/page', {
          chrome: chrome(),
          layout: 'layout.njk',
          pageTitle: pageTitle(page),
          heading: pageTitle(page),
          buttonText: t('chrome.saveAndContinue'),
          fields: descriptors.map((d) => d.view),
          backLink: backLinkFor(page),
          crumb: request.plugins?.crumb ?? null
        })
      }
    },
    post: {
      handler(request, h) {
        const state = readState(request)
        const result = validatePagePayload(page, request.payload, state)
        if (!result.ok) {
          // Preserve user input on re-render: pass the submitted
          // `values` map through so widgets show what the user just
          // typed, not the stored (or blank) state.
          const descriptors = fieldsForPage(page, state, result.fieldErrors, {
            submittedValues: result.values
          })
          return h
            .view('shared/page', {
              chrome: chrome(),
              layout: 'layout.njk',
              pageTitle: pageTitle(page),
              heading: pageTitle(page),
              buttonText: t('chrome.saveAndContinue'),
              fields: descriptors.map((d) => d.view),
              backLink: backLinkFor(page),
              errorSummary: result.errorList,
              crumb: request.plugins?.crumb ?? null
            })
            .code(400)
        }
        writeAnswer(request, result.values)
        const stateAfter = readState(request)
        const target = nextAfter(page, stateAfter)
        return h.redirect(urlForNext(target))
      }
    }
  }
}

/**
 * pageRouteName — used by the plugin registrar. Given a page node, the
 * public URL is /prototype/eudpa-249/pages/<page.page>.
 */
export function pageRouteName(page) {
  return page.page
}

export function findControllerForRoute(pageName) {
  const page = findPage(pageName)
  if (!page) return null
  return makePageController(page)
}
