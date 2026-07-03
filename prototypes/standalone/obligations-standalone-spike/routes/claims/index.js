import { pagePath } from '../../journey/index.js'
import {
  getClaimsAddForm,
  getClaimsList,
  getRemoveClaim,
  postClaimsAddForm,
  postClaimsList
} from './handlers.js'
import { page } from './page-model.js'

/**
 * The claims manage-list, add sub-page and remove-by-index over the
 * presentsForEach indexed obligations (claimType + claimAmount share one
 * minted fulfilment id per claim). URL scheme, spike-a parity:
 *   {BASE}/claims                  the manage list (loop hub)
 *   {BASE}/claims/add              add one claim
 *   {BASE}/claims/{index}/remove   remove one claim
 */

const options = { auth: false, app: { surface: 'page', pageId: page.id } }

export const claimsRoutes = () => [
  {
    method: 'GET',
    path: pagePath(page.slug),
    options,
    handler: getClaimsList
  },
  {
    method: 'POST',
    path: pagePath(page.slug),
    options,
    handler: postClaimsList
  },
  {
    method: 'GET',
    path: pagePath(page.addPage.slug),
    options,
    handler: getClaimsAddForm
  },
  {
    method: 'POST',
    path: pagePath(page.addPage.slug),
    options,
    handler: postClaimsAddForm
  },
  {
    method: 'GET',
    path: pagePath('claims/{index}/remove'),
    options,
    handler: getRemoveClaim
  }
]
