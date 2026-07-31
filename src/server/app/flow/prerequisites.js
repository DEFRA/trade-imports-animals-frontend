import {
  walkObligations,
  ENFORCED_AT_CONTINUE
} from '../bridge/obligation-source.js'
import { pageOfObligation } from './dispatch.js'
import { journeySections } from './journey-flow.js'

const allFlowPages = () => journeySections().flatMap((section) => section.pages)

const flowIndexOfPage = (pageId) =>
  allFlowPages().findIndex((page) => page.id === pageId)

const continueObligationOwners = () =>
  [...walkObligations()]
    .filter(({ obligation }) => ENFORCED_AT_CONTINUE.has(obligation.name))
    .map(({ templatePath, obligation }) => ({
      id: obligation.name,
      flowIndex: flowIndexOfPage(pageOfObligation(templatePath))
    }))

const continuePrereqsBefore = (flowIndex) =>
  continueObligationOwners()
    .filter((owner) => owner.flowIndex !== -1 && owner.flowIndex < flowIndex)
    .map((owner) => owner.id)

export const pagePrerequisites = (pageId) =>
  continuePrereqsBefore(flowIndexOfPage(pageId))

export const sectionPrerequisites = (section) => {
  const first = section.pages[0]
  return first ? pagePrerequisites(first.id) : []
}
