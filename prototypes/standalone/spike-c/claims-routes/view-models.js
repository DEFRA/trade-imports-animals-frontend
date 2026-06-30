import { getClaims, claimTypeItems, claimLabel } from '../lib/claims.js'
import { BASE, LAYOUT, breadcrumbs, navBack } from '../journey/index.js'

/** The claims list + add-a-claim view models. */

export const TEMPLATE_CLAIMS_LIST = 'standalone/spike-c/templates/claims-list'
export const TEMPLATE_CLAIMS_ADD = 'standalone/spike-c/templates/claims-add'

export const claimsPath = (id, suffix) => `${BASE}/${id}/${suffix}`

const claimRows = (quote) =>
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

export const addClaimView = (quote, { claimType, ...rest } = {}) => ({
  layout: LAYOUT,
  pageTitle: 'Add a claim',
  quote,
  items: claimTypeItems(claimType),
  backLink: claimsPath(quote.id, 'claims'),
  breadcrumbs: breadcrumbs(quote, 'Add a claim'),
  ...rest
})

export const renderClaimsList = (quote, request, toolkit) =>
  toolkit.view(TEMPLATE_CLAIMS_LIST, {
    layout: LAYOUT,
    pageTitle: 'Claims you have added',
    quote,
    rows: claimRows(quote),
    backLink: navBack(quote.id, 'claims'),
    breadcrumbs: breadcrumbs(quote, 'Your claims')
  })

export const renderAddClaim = (quote, request, toolkit) =>
  toolkit.view(TEMPLATE_CLAIMS_ADD, addClaimView(quote))
