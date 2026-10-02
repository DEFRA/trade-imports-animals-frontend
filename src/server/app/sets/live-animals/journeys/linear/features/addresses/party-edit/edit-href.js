import { pagePath } from '../../../../../../../shared/paths.js'

/** The link to edit a party's copied address, naming the page to come back to.
 * `change` carries the check-your-answers context through, as the hub's own
 * links do. */
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
