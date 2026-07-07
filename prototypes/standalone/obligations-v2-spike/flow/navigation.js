import { hubPath, pagePath } from '../config.js'
import { pageGatePasses } from './gates.js'
import { sectionOfPage, sections } from './flow.js'

/**
 * Navigation over the flow — pure reads of the scope facts. Each page's gate
 * (authored, or derived from its `collects` — see `flow/gates.js`) is
 * honoured; when a section runs out of applicable pages the user returns to
 * the hub (the "linear run, then back to the hub" shape). Nothing here
 * derives scope or mutates data.
 */

/** First applicable page of a section (its entry point from the hub). */
export const sectionEntry = (sectionId, scope) => {
  const section = sections.find((candidate) => candidate.id === sectionId)
  const page = section?.pages.find((candidate) =>
    pageGatePasses(candidate, scope)
  )
  return page ? pagePath(page.slug) : hubPath()
}

/** Next applicable page in the SAME section after `pageId`, else the hub. */
export const nextInSection = (pageId, scope) => {
  const section = sectionOfPage(pageId)
  if (!section) return hubPath()
  const index = section.pages.findIndex((page) => page.id === pageId)
  const next = section.pages
    .slice(index + 1)
    .find((page) => pageGatePasses(page, scope))
  return next ? pagePath(next.slug) : hubPath()
}
