import { walkObligations } from '../registry.js'
import { allFlowPages } from './flow.js'
import { pageOfObligation } from './dispatch.js'

const flowIndexOfPage = (pageId) =>
  allFlowPages.findIndex((page) => page.id === pageId)

const continueObligationOwners = () => {
  const owners = []
  for (const { templatePath, obligation } of walkObligations()) {
    if (obligation.enforcedAt !== 'continue') continue
    owners.push({
      id: obligation.id,
      flowIndex: flowIndexOfPage(pageOfObligation(templatePath))
    })
  }
  return owners
}

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
