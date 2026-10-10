import { hubPath, pagePath } from '../shared/paths.js'
import { pageGatePasses } from './gates.js'
import { journeySections, journeyTaskRows } from './journey-flow.js'

const sectionOfPage = (pageId) =>
  journeySections().find((section) =>
    section.pages.some((page) => page.id === pageId)
  )

export const sectionEntry = (sectionId, scope, journeyId) => {
  const section = journeySections().find(
    (candidate) => candidate.id === sectionId
  )
  const page = section?.pages.find((candidate) =>
    pageGatePasses(candidate, scope)
  )
  return page ? pagePath(journeyId, page.slug) : hubPath(journeyId)
}

// A task row always has a way in. The hub links every row from the moment the
// notification exists, so this never answers "nowhere": the gate still chooses
// which of the row's pages opens, skipping one whose questions are out of
// scope for this consignment, but when it rules them all out the row opens at
// its first page. That page decides for itself what to show someone who has
// answered nothing else yet.
export const rowEntry = (row, scope, journeyId) => {
  const page =
    row.pages.find((candidate) => pageGatePasses(candidate, scope)) ??
    row.pages[0]
  return pagePath(journeyId, page.slug)
}

const nextSectionPage = (pageId, scope) => {
  const section = sectionOfPage(pageId)
  if (!section) {
    return undefined
  }
  const index = section.pages.findIndex((page) => page.id === pageId)
  return section.pages
    .slice(index + 1)
    .find((page) => pageGatePasses(page, scope))
}

const taskRowOfPage = (pageId) =>
  journeyTaskRows().find((row) => row.pages.some((page) => page.id === pageId))

const staysInTaskRow = (row, page) =>
  !row || row.pages.some((candidate) => candidate.id === page.id)

export const nextInSection = (pageId, scope, journeyId) => {
  const next = nextSectionPage(pageId, scope)
  return next ? pagePath(journeyId, next.slug) : hubPath(journeyId)
}

export const nextInTaskRow = (pageId, scope, journeyId) => {
  const next = nextSectionPage(pageId, scope)
  return next && staysInTaskRow(taskRowOfPage(pageId), next)
    ? pagePath(journeyId, next.slug)
    : hubPath(journeyId)
}
