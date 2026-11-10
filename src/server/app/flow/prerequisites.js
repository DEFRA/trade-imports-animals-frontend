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
    .map(({ templatePath, obligation }) => {
      const ownerPageId = pageOfObligation(templatePath)
      return {
        id: obligation.name,
        ownerPageId,
        flowIndex: flowIndexOfPage(ownerPageId)
      }
    })

const continueOwnersBefore = (flowIndex) =>
  continueObligationOwners().filter(
    (owner) => owner.flowIndex !== -1 && owner.flowIndex < flowIndex
  )

const continuePrereqsBefore = (flowIndex) =>
  continueOwnersBefore(flowIndex).map((owner) => owner.id)

export const pagePrerequisites = (pageId) =>
  continuePrereqsBefore(flowIndexOfPage(pageId))

export const sectionPrerequisites = (section) => {
  const first = section.pages[0]
  return first ? pagePrerequisites(first.id) : []
}

/**
 * The required earlier answers a page is missing.
 *
 * @param {string} pageId - the page that needs them.
 * @param {object} scope - the journey's scope.
 * @returns {{ askingPageId: string, missingAnswerIds: string[] }|undefined} the
 * page that asks for the earliest missing answer in page order and every
 * missing answer id, or undefined when none is missing.
 */
export const earliestMissingAnswerPage = (pageId, scope) => {
  const missing = continueOwnersBefore(flowIndexOfPage(pageId))
    .filter((owner) => !scope.answered(owner.id))
    .sort((ownerA, ownerB) => ownerA.flowIndex - ownerB.flowIndex)
  return missing.length === 0
    ? undefined
    : {
        askingPageId: missing[0].ownerPageId,
        missingAnswerIds: missing.map((owner) => owner.id)
      }
}
