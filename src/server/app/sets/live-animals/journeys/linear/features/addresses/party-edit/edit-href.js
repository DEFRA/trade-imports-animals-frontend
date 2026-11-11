import { pagePath } from '../../../../../../../shared/paths.js'
import { withReturnMarker, withTrail } from '../../../../../../../shared/kit.js'

export const partyEditHref = (journeyId, party, returnSlug, trail) =>
  withTrail(
    withReturnMarker(pagePath(journeyId, party.editSlug), returnSlug),
    trail
  )
