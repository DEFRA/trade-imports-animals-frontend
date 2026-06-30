import { getClaims, claimTypeItems, claimLabel } from '../lib/claims.js'
import { BASE, LAYOUT, breadcrumbs } from '../journey/index.js'

/**
 * View-name constants, URL helper and the page view-models for the claims
 * loop's list and add pages.
 */

export const CLAIMS_LIST_VIEW = 'standalone/spike-b/templates/claims-list'
export const CLAIMS_ADD_VIEW = 'standalone/spike-b/templates/claims-add'

export const claimsPath = (id, suffix) => `${BASE}/${id}/${suffix}`

export const claimsListRows = (quote) =>
  getClaims(quote).map((claim, index) => ({
    key: { text: `Claim ${index + 1}` },
    value: { text: claimLabel(claim) },
    actions: {
      items: [
        {
          href: claimsPath(quote.id, `claims/${index}/remove`),
          text: 'Remove',
          visuallyHiddenText: `claim ${index + 1}`
        }
      ]
    }
  }))

export const addClaimView = (quote, extras = {}) => {
  const { selectedClaimType, ...rest } = extras
  return {
    layout: LAYOUT,
    pageTitle: 'Add a claim',
    quote,
    items: claimTypeItems(selectedClaimType),
    backLink: claimsPath(quote.id, 'claims'),
    breadcrumbs: breadcrumbs(quote, 'Add a claim'),
    ...rest
  }
}
