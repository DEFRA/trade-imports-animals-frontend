import { makeScope } from '../engine/index.js'
import { pageGatePasses, sectionGatePasses } from '../flow/gates.js'
import { journeySections } from '../flow/journey-flow.js'

export const simulateJourney = (answers = {}) => {
  const scope = makeScope(answers)
  return journeySections()
    .filter((section) => sectionGatePasses(section, scope))
    .flatMap((section) => section.pages)
    .filter((page) => pageGatePasses(page, scope))
    .map((page) => page.id)
}
