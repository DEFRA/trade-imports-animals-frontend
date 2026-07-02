import {
  firstApplicablePage,
  firstPagePresentingObligation,
  firstUnfulfilledPage,
  nextAfter as nextPageAfter,
  sectionEntry as sectionEntryPage
} from '../flow-eval/index.js'
import { changePath, hubPath, pagePath } from '../journey/paths.js'
import { journeyFlow, journeyModel } from './status.js'

/**
 * [navigation] — the three pure primitives re-exported by identity (the
 * interrogation Level-1 promise: what routes use IS what the doc names)
 * plus the URL-returning journey moves: post-POST advance, Task List
 * section entry and CYA Change targets.
 *
 * Change targets follow spike-a's split: a plain question page
 * round-trips via `?change=1` back to CYA; the claims manage-list and
 * the add-on picker return through their own flow (their saves spawn or
 * remove follow-up work that `?change=1` would skip past).
 */

export {
  firstApplicablePage,
  firstUnfulfilledPage,
  firstPagePresentingObligation
}

/**
 * The nearest enclosing Group of a Page — its hub-task boundary. A page
 * directly under a top-level Section belongs to that Section; a page
 * inside an add-on SubSection belongs to the SubSection, because each
 * selected add-on is its own hub task row (spike-a parity: the add-on
 * picker POST and the last step of an add-on both 302 to the hub).
 */
const taskGroupOfPage = (flow, pageId) => {
  const walk = (group) => {
    for (const child of group.children ?? []) {
      if (child.kind === 'page') {
        if (child.id === pageId) {
          return group
        }
      } else {
        const found = walk(child)
        if (found) {
          return found
        }
      }
    }
    return null
  }
  return flow.sections.reduce((found, section) => found ?? walk(section), null)
}

/**
 * nextAfter(pageId, evaluation) -> URL. The next applicable
 * non-Fulfilled Page after `pageId` in its Section subtree, STOPPING at
 * the page's task-group boundary; the hub when the task is done or the
 * advance would cross into another hub task (an add-on SubSection —
 * spike-a parity, see taskGroupOfPage).
 */
export function nextAfter(pageId, evaluation, options = {}) {
  const { flow = journeyFlow(), conditions } = options
  const page = nextPageAfter(flow, pageId, evaluation, { conditions })
  const withinTask =
    page && taskGroupOfPage(flow, page.id) === taskGroupOfPage(flow, pageId)
  return withinTask ? pagePath(page.slug) : hubPath()
}

/**
 * sectionEntry(sectionId, evaluation) -> URL for a Task List click,
 * resolved through the Section's entry mode. The hub is the defensive
 * fallback for a Section with nothing applicable to enter.
 */
export function sectionEntry(sectionId, evaluation, options = {}) {
  const { flow = journeyFlow(), conditions } = options
  const section = flow.sections.find((candidate) => candidate.id === sectionId)
  if (!section) {
    throw new Error(`Unknown section "${sectionId}"`)
  }
  const page = sectionEntryPage(flow, section, evaluation, { conditions })
  return page ? pagePath(page.slug) : hubPath()
}

/** Does this obligation control derived-indexed follow-up rows? */
const controlsDerivedRows = (obligations, obligationId) =>
  obligations.some(
    (record) => record.indexedBy?.controllingObligation === obligationId
  )

/**
 * changeTarget(obligationName) -> URL for a CYA Change link. First
 * presenting Page in depth-first order wins (settled option a of the
 * amend-link question).
 */
export function changeTarget(obligationName, options = {}) {
  const { flow = journeyFlow() } = options
  const { obligations, identifiers } = journeyModel()
  const obligationId = identifiers.idOf(obligationName)
  const page = firstPagePresentingObligation(flow, obligationId)
  if (!page) {
    throw new Error(`No page presents obligation "${obligationName}"`)
  }
  const ownFlow =
    (page.presentsForEach ?? []).some(
      (entry) => entry.obligation === obligationId
    ) || controlsDerivedRows(obligations, obligationId)
  return ownFlow ? pagePath(page.slug) : changePath(page.slug)
}
