import { containerApplies, journeyFlowConditions } from '../applies-when.js'
import {
  containerStatus,
  FULFILLED,
  NOT_APPLICABLE
} from '../container-status.js'

/**
 * Post-POST advance (obligations.md:1265-1269): the next applicable
 * non-Fulfilled Page after `pageId` in its top-level Section's subtree,
 * in declared depth-first order. Null means the Section is done — the
 * caller returns to the hub. Gated-out ancestors (a deselected add-on's
 * SubSection) exclude their Pages wholesale.
 *
 * [provisional — open ruling record item 6, STATUS-23/25/31] The rule is
 * status-filtered as the doc and DESIGN-DECISION pin it: Not Applicable
 * and already-Fulfilled Pages are skipped. Spike-a advances structurally
 * regardless of status; the two coincide on every shared spec and
 * diverge only when re-saving an early page of a complete Section.
 */

const collectPages = (
  container,
  section,
  evaluation,
  conditions,
  gatedOut,
  pages
) => {
  const excluded =
    gatedOut || !containerApplies(container, evaluation, conditions)
  if (container.kind === 'page') {
    pages.push({ page: container, gatedOut: excluded, section })
    return pages
  }
  for (const child of container.children ?? []) {
    collectPages(child, section, evaluation, conditions, excluded, pages)
  }
  return pages
}

export function nextAfter(flow, pageId, evaluation, options = {}) {
  const { conditions = journeyFlowConditions } = options
  const pages = []
  for (const section of flow.sections) {
    collectPages(section, section, evaluation, conditions, false, pages)
  }

  const from = pages.findIndex(({ page }) => page.id === pageId)
  if (from === -1) {
    throw new Error(`Unknown page "${pageId}"`)
  }
  const section = pages[from].section
  for (const candidate of pages.slice(from + 1)) {
    if (candidate.section !== section || candidate.gatedOut) {
      continue
    }
    const status = containerStatus(candidate.page, evaluation, options)
    if (status === NOT_APPLICABLE || status === FULFILLED) {
      continue
    }
    return candidate.page
  }
  return null
}
