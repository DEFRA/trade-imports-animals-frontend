import { makeScope } from '../engine/index.js'
import { sections } from '../flow/flow.js'
import { pageGatePasses, sectionGatePasses } from '../flow/gates.js'

export const simulateJourney = (answers = {}) => {
  const scope = makeScope(answers)
  return sections
    .filter((section) => sectionGatePasses(section, scope))
    .flatMap((section) => section.pages)
    .filter((page) => pageGatePasses(page, scope))
    .map((page) => page.id)
}
