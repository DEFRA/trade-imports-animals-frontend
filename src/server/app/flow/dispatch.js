import {
  walkObligations,
  SYSTEM_POPULATED
} from '../bridge/obligation-source.js'
import {
  currentSetId,
  setKeyed,
  withSetContext
} from '../shared/set-context.js'

const store = setKeyed('dispatch')

const emptyDispatch = () => ({
  pageOfObligation: new Map(),
  collectsByPage: new Map(),
  slugByPage: new Map(),
  built: false
})

const current = () => {
  const setId = currentSetId()
  if (!store.has(setId)) store.configure(setId, emptyDispatch())
  return store.current()
}

const ID_UNSAFE = /[.[\]]/

const ancestorTemplate = (templatePath) => {
  const dot = templatePath.lastIndexOf('.')
  return dot === -1 ? null : templatePath.slice(0, dot)
}

const ownerOfObligation = (address) => {
  let currentPath = address.replace(/\[\d+\]/g, '')
  while (currentPath !== null) {
    if (current().pageOfObligation.has(currentPath)) {
      return current().pageOfObligation.get(currentPath)
    }
    currentPath = ancestorTemplate(currentPath)
  }
  return undefined
}

const resetDispatchState = () => {
  const dispatch = current()
  dispatch.built = false
  dispatch.pageOfObligation.clear()
  dispatch.collectsByPage.clear()
  dispatch.slugByPage.clear()
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
  current().collectsByPage.set(page.id, page.collects ?? [])
  current().slugByPage.set(page.id, page.slug)
}

const claimObligationOwner = (obligationId, pageId) => {
  if (current().pageOfObligation.has(obligationId)) {
    throw new Error(
      `Obligation "${obligationId}" is collected by two pages: ` +
        `"${current().pageOfObligation.get(obligationId)}" and "${pageId}"`
    )
  }
  current().pageOfObligation.set(obligationId, pageId)
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

export const buildDispatch = (setId, pages) => {
  store.configure(setId, emptyDispatch())
  withSetContext(setId, () => {
    resetDispatchState()
    assertPathSafeIds()
    indexPages(pages)
    assertFullCoverage()
    current().built = true
  })
}

export const isDispatchBuilt = () => current().built

export const pageOfObligation = (obligationId) =>
  ownerOfObligation(obligationId)

export const collectsOf = (pageId) => current().collectsByPage.get(pageId) ?? []

export const slugOfPage = (pageId) => current().slugByPage.get(pageId)
