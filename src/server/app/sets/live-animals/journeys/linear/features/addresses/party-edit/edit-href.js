import { pagePath } from '../../../../../../../shared/paths.js'
import { withTrail } from '../../../../../../../shared/kit.js'

export const partyEditHref = (journeyId, party, returnSlug, trail) => {
  const query = new URLSearchParams({ return: returnSlug })
  return withTrail(`${pagePath(journeyId, party.editSlug)}?${query}`, trail)
}
