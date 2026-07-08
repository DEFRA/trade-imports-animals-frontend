import { makeScope } from '../engine/index.js'
import { sections } from '../flow/flow.js'
import { pageGatePasses, sectionGatePasses } from '../flow/gates.js'

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
