import { statusOf, NA, FULFILLED, OPTIONAL } from '../engine/status.js'
import { statusOfFromB } from '../model/bridge/status.js'
import { isModelB } from '../engine/model-flag.js'
import { collectsOf } from './dispatch.js'
import { rowStatus, taskRows } from './task-rows.js'

export const sectionObligationIds = (section) =>
  section.pages.flatMap((page) => collectsOf(page.id))

export const sectionStatus = (section, answers, inScope) =>
  isModelB()
    ? statusOfFromB(sectionObligationIds(section), answers, inScope)
    : statusOf(sectionObligationIds(section), answers, inScope)

export const readyForCheckYourAnswers = (answers, inScope) =>
  taskRows.every((row) => {
    const status = rowStatus(row, answers, inScope)
    return status === FULFILLED || status === NA || status === OPTIONAL
  })
