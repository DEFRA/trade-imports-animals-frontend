import { walkObligations } from '../registry.js'
import { allFlowPages } from './flow.js'
import { pageOfObligation } from './dispatch.js'

/**
 * RULE 1 — mandate-derived flow sequencing. A page/section is available only
 * once every `enforcedAt: 'continue'` obligation owned by a STRICTLY-EARLIER
 * flow step is answered. The prerequisite set is DERIVED, never hand-authored:
 * it falls out of flow order (`allFlowPages`) + the dispatch index (which page
 * owns each obligation) + the obligation's own `enforcedAt` fact.
 *
 * A step never blocks on its OWN continue obligation (only strictly-earlier
 * ones), so `commodities` opens on `countryOfOrigin` but not on its own
 * `commoditySelection`; everything after `commodities` opens on
 * `commoditySelection`.
 */

const flowIndexOfPage = (pageId) =>
  allFlowPages.findIndex((page) => page.id === pageId)

/**
 * Every `enforcedAt: 'continue'` obligation (at any depth), paired with the
 * flow index of the page that owns it. Recomputed per call — cheap, and it must
 * read the dispatch index, which only exists after boot. An item-level
 * obligation (`commoditySelection`) resolves to its collection's owning page.
 */
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

/** The continue-obligation ids a page must have answered to be available. */
export const pagePrerequisites = (pageId) =>
  continuePrereqsBefore(flowIndexOfPage(pageId))

/**
 * A section's prerequisites are those of its FIRST page — the section is
 * available exactly when you can enter its first page.
 */
export const sectionPrerequisites = (section) => {
  const first = section.pages[0]
  return first ? pagePrerequisites(first.id) : []
}
