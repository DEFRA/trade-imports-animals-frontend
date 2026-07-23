import { NA, FULFILLED, OPTIONAL, statusOf } from '../bridge/status.js'
import { collectsOf } from './dispatch.js'
import { rowStatus, taskRows } from './task-rows.js'

export const sectionObligationIds = (section) =>
  section.pages.flatMap((page) => collectsOf(page.id))

export const sectionStatus = (section, answers, inScope) =>
  statusOf(sectionObligationIds(section), answers, inScope)

export const readyForCheckYourAnswers = (answers, inScope, evaluation) =>
  taskRows.every((row) => {
    const status = rowStatus(row, answers, inScope, evaluation)
    return status === FULFILLED || status === NA || status === OPTIONAL
  })
