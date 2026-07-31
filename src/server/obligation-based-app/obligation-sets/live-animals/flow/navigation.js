import { hubPath, pagePath } from '../config.js'
import { pageGatePasses } from './gates.js'
import { sectionOfPage, sections } from './flow.js'

export const sectionEntry = (sectionId, scope, journeyId) => {
  const section = sections.find((candidate) => candidate.id === sectionId)
  const page = section?.pages.find((candidate) =>
    pageGatePasses(candidate, scope)
  )
  return page ? pagePath(journeyId, page.slug) : hubPath(journeyId)
}

export const rowEntry = (row, scope, journeyId) => {
  const page = row.pages.find((candidate) => pageGatePasses(candidate, scope))
  return page ? pagePath(journeyId, page.slug) : hubPath(journeyId)
}

export const rowGatePasses = (row, scope) => pageGatePasses(row.pages[0], scope)

export const nextInSection = (pageId, scope, journeyId) => {
  const section = sectionOfPage(pageId)
  if (!section) return hubPath(journeyId)
  const index = section.pages.findIndex((page) => page.id === pageId)
  const next = section.pages
    .slice(index + 1)
    .find((page) => pageGatePasses(page, scope))
  return next ? pagePath(journeyId, next.slug) : hubPath(journeyId)
}
