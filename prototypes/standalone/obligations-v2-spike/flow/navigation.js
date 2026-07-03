import { hubPath, pagePath } from '../config.js'
import { sectionOfPage, sections } from './flow.js'

/**
 * Navigation over the flow — pure reads of the scope facts. A `gate` on a
 * page or section is honoured; when a section runs out of applicable pages
 * the user returns to the hub (the "linear run, then back to the hub"
 * shape). Nothing here derives scope or mutates data.
 */
const gatePasses = (page, scope) => !page.gate || page.gate(scope)

/** First applicable page of a section (its entry point from the hub). */
export const sectionEntry = (sectionId, scope) => {
  const section = sections.find((s) => s.id === sectionId)
  const page = section?.pages.find((p) => gatePasses(p, scope))
  return page ? pagePath(page.slug) : hubPath()
}

/** Next applicable page in the SAME section after `pageId`, else the hub. */
export const nextInSection = (pageId, scope) => {
  const section = sectionOfPage(pageId)
  if (!section) return hubPath()
  const index = section.pages.findIndex((p) => p.id === pageId)
  const next = section.pages.slice(index + 1).find((p) => gatePasses(p, scope))
  return next ? pagePath(next.slug) : hubPath()
}
