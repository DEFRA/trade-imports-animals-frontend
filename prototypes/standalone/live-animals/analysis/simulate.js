import { makeScope } from '../engine/index.js'
import { sections } from '../flow/flow.js'
import { pageGatePasses, sectionGatePasses } from '../flow/gates.js'

/**
 * Persona (answers) -> ordered list of page ids the persona would visit.
 * Derives scope via the real `makeScope` and the real flow gates so it can
 * never drift from runtime; it re-implements nothing.
 */
export function simulateJourney(answers = {}) {
  const scope = makeScope(answers)
  const pages = []
  for (const section of sections) {
    if (!sectionGatePasses(section, scope)) continue
    for (const page of section.pages) {
      if (pageGatePasses(page, scope)) pages.push(page.id)
    }
  }
  return pages
}
