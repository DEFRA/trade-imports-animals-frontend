import { walkObligations } from '../registry.js'

let pageOfObligationMap = new Map()
let collectsByPageMap = new Map()
let slugByPageMap = new Map()
let dispatchBuilt = false

const ID_UNSAFE = /[.[\]]/

const ancestorTemplate = (templatePath) => {
  const dot = templatePath.lastIndexOf('.')
  return dot === -1 ? null : templatePath.slice(0, dot)
}

// Accepts BOTH the template form (`claims.claimType`) and the bracketed
// INSTANCE form the engine's scope/wipe layer speaks (`claims[0].claimType`)
// — the index normalisation exists so a per-instance change link can resolve
// its owning page.
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
  dispatchBuilt = false
  pageOfObligationMap = new Map()
  collectsByPageMap = new Map()
  slugByPageMap = new Map()

  // An id is a store key AND a segment of a dotted template address — a path
  // metacharacter in it would make addresses ambiguous.
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
  dispatchBuilt = true
}

// Checked by flow/gates.js before it reads `collectsOf`: the `?? []` fallback
// below is legitimate for a page that collects nothing (quote-summary) but
// would silently gate EVERY step out if the whole index were unbuilt.
export const isDispatchBuilt = () => dispatchBuilt

export const pageOfObligation = (obligationId) =>
  ownerOfObligation(obligationId)

export const collectsOf = (pageId) => collectsByPageMap.get(pageId) ?? []

export const slugOfPage = (pageId) => slugByPageMap.get(pageId)
