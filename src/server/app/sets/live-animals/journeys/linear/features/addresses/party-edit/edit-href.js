import { pagePath } from '../../../../../../../shared/paths.js'
import * as kit from '../../../../../../../shared/kit.js'

export const partyEditHref = (
  journeyId,
  party,
  returnSlug,
  { change = false } = {}
) => {
  const query = new URLSearchParams({ return: returnSlug })
  const href = `${pagePath(journeyId, party.editSlug)}?${query}`
  return change ? kit.appendChangeContext(href) : href
}
