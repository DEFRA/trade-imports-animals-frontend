import { statusOf, NA, FULFILLED } from '../engine/status.js'
import { collectsOf } from './dispatch.js'
import { nonQuoteSections } from './flow.js'

/**
 * The FLOW-AWARE roll-up — section status and quote-readiness. It sits in
 * `flow/` because it needs the dispatch index (`collectsOf`, boot-derived from
 * each page's `collects`) and the flow's section list — knowledge the
 * engine-pure `status.js` deliberately no longer reaches for. It reads the
 * engine's `statusOf` DOWNWARD (flow -> engine), never the reverse.
 */

/** Union of every obligation the section's pages collect. */
export const sectionObligationIds = (section) =>
  section.pages.flatMap((page) => collectsOf(page.id))

export const sectionStatus = (section, answers, inScope) =>
  statusOf(sectionObligationIds(section), answers, inScope)

/** The quote unlocks once every other section is Fulfilled or Not Applicable. */
export const readyForQuote = (answers, inScope) =>
  nonQuoteSections.every((section) => {
    const status = sectionStatus(section, answers, inScope)
    return status === FULFILLED || status === NA
  })
