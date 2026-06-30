import { BASE } from '../journey/index.js'
import { renderClaimsList, renderAddClaim } from './view-models.js'
import {
  withQuote,
  postClaimsList,
  postAddClaim,
  postRemoveClaim
} from './handlers.js'

/**
 * The "add another" claims loop, as plain routes for this journey. Driving
 * history asks whether the driver has had a claim; if yes they drop into this
 * loop, add 0..N claims one at a time via a list page, then rejoin the main
 * flow. URL scheme:
 *   {base}/{id}/claims              the manage list (loop hub)
 *   {base}/{id}/claims/add          add one claim
 *   {base}/{id}/claims/{index}/remove
 */

const open = { auth: false }

export function claimsRoutes() {
  return [
    {
      method: 'GET',
      path: `${BASE}/{id}/claims`,
      options: open,
      handler: withQuote(renderClaimsList)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/claims`,
      options: open,
      handler: withQuote(postClaimsList)
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/claims/add`,
      options: open,
      handler: withQuote(renderAddClaim)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/claims/add`,
      options: open,
      handler: withQuote(postAddClaim)
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/claims/{index}/remove`,
      options: open,
      handler: withQuote(postRemoveClaim)
    }
  ]
}
