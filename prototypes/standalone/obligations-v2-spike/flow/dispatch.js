import { registry } from '../state/obligations/registry.js'

/**
 * THE dispatch seam — obligation -> owning page. It is DERIVED at boot
 * from every page's page-side `collects` declaration (the authored source
 * of truth), so the model never names a page and the hub/CYA can still
 * ask "which page owns obligation X".
 *
 * `buildDispatch(pages)` inverts the declarations and COVERAGE-ASSERTS
 * them (graft): every non-system obligation is collected by exactly one
 * page, or boot crashes — turning a forgotten/duplicated `collects` from a
 * silent runtime break into a startup failure.
 */
let pageOfObligationMap = new Map()
let collectsByPageMap = new Map()
let slugByPageMap = new Map()

export function buildDispatch(pages) {
  pageOfObligationMap = new Map()
  collectsByPageMap = new Map()
  slugByPageMap = new Map()

  for (const page of pages) {
    collectsByPageMap.set(page.id, page.collects ?? [])
    slugByPageMap.set(page.id, page.slug)
    for (const obligationId of page.collects ?? []) {
      if (pageOfObligationMap.has(obligationId)) {
        throw new Error(
          `Obligation "${obligationId}" is collected by two pages: ` +
            `"${pageOfObligationMap.get(obligationId)}" and "${page.id}"`
        )
      }
      pageOfObligationMap.set(obligationId, page.id)
    }
  }

  const uncovered = registry.all
    .filter((o) => !o.system && !pageOfObligationMap.has(o.id))
    .map((o) => o.id)
  if (uncovered.length) {
    throw new Error(`Obligations collected by no page: ${uncovered.join(', ')}`)
  }
}

export const pageOfObligation = (obligationId) =>
  pageOfObligationMap.get(obligationId)

export const collectsOf = (pageId) => collectsByPageMap.get(pageId) ?? []

export const slugOfPage = (pageId) => slugByPageMap.get(pageId)
