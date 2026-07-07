import { statusOf, NA, FULFILLED } from '../engine/status.js'
import { collectsOf } from './dispatch.js'
import { nonQuoteSections } from './flow.js'

export const sectionObligationIds = (section) =>
  section.pages.flatMap((page) => collectsOf(page.id))

export const sectionStatus = (section, answers, inScope) =>
  statusOf(sectionObligationIds(section), answers, inScope)

export const readyForQuote = (answers, inScope) =>
  nonQuoteSections.every((section) => {
    const status = sectionStatus(section, answers, inScope)
    return status === FULFILLED || status === NA
  })
