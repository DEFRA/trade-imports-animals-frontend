import { pagePath } from '../../../../../../../shared/paths.js'

/** `change` carries the check-your-answers context through, as the hub's links do. */
export const partyEditHref = (
  journeyId,
  party,
  returnSlug,
  { change = false } = {}
) => {
  const query = new URLSearchParams({ return: returnSlug })
  if (change) {
    query.set('change', '1')
  }
  return `${pagePath(journeyId, party.editSlug)}?${query}`
}
