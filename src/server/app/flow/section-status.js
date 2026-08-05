import { NA, FULFILLED, OPTIONAL, statusOf } from '../bridge/status/index.js'
import { collectsOf } from './dispatch.js'
import { journeyRowStatus, journeyTaskRows } from './journey-flow.js'

export const sectionObligationIds = (section) =>
  section.pages.flatMap((page) => collectsOf(page.id))

export const sectionStatus = (section, answers, inScope, evaluation) =>
  statusOf(sectionObligationIds(section), answers, inScope, evaluation)

export const readyForCheckYourAnswers = (answers, inScope, evaluation) =>
  journeyTaskRows().every((row) => {
    const status = journeyRowStatus(row, answers, inScope, evaluation)
    return status === FULFILLED || status === NA || status === OPTIONAL
  })
