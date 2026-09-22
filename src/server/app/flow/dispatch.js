import {
  walkObligations,
  SYSTEM_POPULATED
} from '../bridge/obligation-source.js'
import { currentSetId, setKeyed } from '../shared/set-context.js'

const ID_UNSAFE = /[.[\]]/

const EMPTY = Object.freeze({
  built: false,
  pageOfObligation: new Map(),
  collectsByPage: new Map(),
  slugByPage: new Map()
})

const store = setKeyed('dispatch')

// Reading before `buildDispatch` is the un-booted case. It answers empty rather
// than throwing, because `flow/gates.js` distinguishes the two itself — an empty
// index would otherwise silently gate every page.
const index = () => (store.has(currentSetId()) ? store.current() : EMPTY)

const ancestorTemplate = (templatePath) => {
  const dot = templatePath.lastIndexOf('.')
  return dot === -1 ? null : templatePath.slice(0, dot)
}

const ownerOfObligation = (address, pageOfObligationMap) => {
  let current = address.replace(/\[\d+\]/g, '')
  while (current !== null) {
    if (pageOfObligationMap.has(current)) {
      return pageOfObligationMap.get(current)
    }
    current = ancestorTemplate(current)
  }
  return undefined
}

const assertPathSafeIds = () => {
  for (const { templatePath, obligation } of walkObligations()) {
    if (ID_UNSAFE.test(obligation.name)) {
      throw new Error(
        `Obligation id "${obligation.name}" (at ${templatePath}) contains a path ` +
          `metacharacter ('.', '[' or ']') — ids must be path-safe`
      )
    }
  }
}

const claimObligationOwner = (pageOfObligationMap, obligationId, pageId) => {
  if (pageOfObligationMap.has(obligationId)) {
    throw new Error(
      `Obligation "${obligationId}" is collected by two pages: ` +
        `"${pageOfObligationMap.get(obligationId)}" and "${pageId}"`
    )
  }
  pageOfObligationMap.set(obligationId, pageId)
}

const indexPages = (pages) => {
  const pageOfObligation = new Map()
  const collectsByPage = new Map()
  const slugByPage = new Map()
  for (const page of pages) {
    collectsByPage.set(page.id, page.collects ?? [])
    slugByPage.set(page.id, page.slug)
    for (const obligationId of page.collects ?? []) {
      claimObligationOwner(pageOfObligation, obligationId, page.id)
    }
  }
  return { built: true, pageOfObligation, collectsByPage, slugByPage }
}

const assertFullCoverage = (pageOfObligationMap) => {
  const uncovered = [...walkObligations()]
    .filter(
      ({ templatePath, obligation }) =>
        !SYSTEM_POPULATED.has(obligation.name) &&
        !ownerOfObligation(templatePath, pageOfObligationMap)
    )
    .map(({ templatePath }) => templatePath)
  if (uncovered.length) {
    throw new Error(`Obligations collected by no page: ${uncovered.join(', ')}`)
  }
}

export const buildDispatch = (setId, pages) => {
  assertPathSafeIds()
  const built = indexPages(pages)
  assertFullCoverage(built.pageOfObligation)
  store.configure(setId, built)
}

export const isDispatchBuilt = () => index().built

export const pageOfObligation = (obligationId) =>
  ownerOfObligation(obligationId, index().pageOfObligation)

export const collectsOf = (pageId) => index().collectsByPage.get(pageId) ?? []

export const slugOfPage = (pageId) => index().slugByPage.get(pageId)
