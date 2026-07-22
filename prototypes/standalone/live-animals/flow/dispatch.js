import { walkObligations, SYSTEM_POPULATED } from './obligation-source.js'

let pageOfObligationMap = new Map()
let collectsByPageMap = new Map()
let slugByPageMap = new Map()
let dispatchBuilt = false

const ID_UNSAFE = /[.[\]]/

const ancestorTemplate = (templatePath) => {
  const dot = templatePath.lastIndexOf('.')
  return dot === -1 ? null : templatePath.slice(0, dot)
}

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

const resetDispatchState = () => {
  dispatchBuilt = false
  pageOfObligationMap = new Map()
  collectsByPageMap = new Map()
  slugByPageMap = new Map()
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

const indexPageMetadata = (page) => {
  collectsByPageMap.set(page.id, page.collects ?? [])
  slugByPageMap.set(page.id, page.slug)
}

const claimObligationOwner = (obligationId, pageId) => {
  if (pageOfObligationMap.has(obligationId)) {
    throw new Error(
      `Obligation "${obligationId}" is collected by two pages: ` +
        `"${pageOfObligationMap.get(obligationId)}" and "${pageId}"`
    )
  }
  pageOfObligationMap.set(obligationId, pageId)
}

const indexPages = (pages) => {
  for (const page of pages) {
    indexPageMetadata(page)
    for (const obligationId of page.collects ?? []) {
      claimObligationOwner(obligationId, page.id)
    }
  }
}

const assertFullCoverage = () => {
  const uncovered = [...walkObligations()]
    .filter(
      ({ templatePath, obligation }) =>
        !SYSTEM_POPULATED.has(obligation.name) &&
        !ownerOfObligation(templatePath)
    )
    .map(({ templatePath }) => templatePath)
  if (uncovered.length) {
    throw new Error(`Obligations collected by no page: ${uncovered.join(', ')}`)
  }
}

export const buildDispatch = (pages) => {
  resetDispatchState()
  assertPathSafeIds()
  indexPages(pages)
  assertFullCoverage()
  dispatchBuilt = true
}

export const isDispatchBuilt = () => dispatchBuilt

export const pageOfObligation = (obligationId) =>
  ownerOfObligation(obligationId)

export const collectsOf = (pageId) => collectsByPageMap.get(pageId) ?? []

export const slugOfPage = (pageId) => slugByPageMap.get(pageId)
