import { walkObligations } from '../registry.js'

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
 *
 * Coverage now DESCENDS THE TREE (DISCUSSION-LOG entry 6a): it asserts over
 * `walkObligations()` — every obligation at EVERY depth. A sub-obligation's owning
 * page is DERIVED: the page that owns its nearest collection ancestor (a
 * collection's items are collected by the collection's loop). This keeps
 * coverage total and unambiguous without the collection's `collects` having to
 * enumerate its item ids — which is what lets `contract.test`'s
 * `claimsList.meta.collects === ['claims']` stay untouched. The trade-off:
 * ownership at depth is derived, not declared per field (see FINDINGS 6a).
 */
let pageOfObligationMap = new Map()
let collectsByPageMap = new Map()
let slugByPageMap = new Map()

const ID_UNSAFE = /[.[\]]/

const ancestorTemplate = (templatePath) => {
  const dot = templatePath.lastIndexOf('.')
  return dot === -1 ? null : templatePath.slice(0, dot)
}

/** The page owning an obligation address directly, or via its nearest
 * collection ancestor (derived ownership). Accepts BOTH the template form
 * (`claims.claimType`) and the bracketed INSTANCE form the engine's scope/wipe
 * layer speaks (`claims[0].claimType`) — instance indices are normalised away
 * first, so a per-instance change link can resolve its owning page. undefined
 * when nothing in the chain owns it. */
const ownerOfObligation = (address) => {
  let current = address.replace(/\[\d+\]/g, '')
  while (current !== null) {
    if (pageOfObligationMap.has(current)) {
      return pageOfObligationMap.get(current)
    }
    current = ancestorTemplate(current)
  }
  return undefined
}

export function buildDispatch(pages) {
  pageOfObligationMap = new Map()
  collectsByPageMap = new Map()
  slugByPageMap = new Map()

  // An obligation id becomes a store key + a segment of a dotted template address, so it
  // must not itself contain the path metacharacters, or addresses would be
  // ambiguous (`claims.claimType` could not be told from a stray-dotted id).
  for (const { templatePath, obligation } of walkObligations()) {
    if (ID_UNSAFE.test(obligation.id)) {
      throw new Error(
        `Obligation id "${obligation.id}" (at ${templatePath}) contains a path ` +
          `metacharacter ('.', '[' or ']') — ids must be path-safe`
      )
    }
  }

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

  const uncovered = [...walkObligations()]
    .filter(
      ({ templatePath, obligation }) =>
        !obligation.system && !ownerOfObligation(templatePath)
    )
    .map(({ templatePath }) => templatePath)
  if (uncovered.length) {
    throw new Error(`Obligations collected by no page: ${uncovered.join(', ')}`)
  }
}

export const pageOfObligation = (obligationId) =>
  ownerOfObligation(obligationId)

export const collectsOf = (pageId) => collectsByPageMap.get(pageId) ?? []

export const slugOfPage = (pageId) => slugByPageMap.get(pageId)
