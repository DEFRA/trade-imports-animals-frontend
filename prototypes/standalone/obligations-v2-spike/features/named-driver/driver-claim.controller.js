import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import {
  claimEntryModel,
  claimFromPayload,
  validateClaim
} from '../claims/entry.controller.js'

/**
 * A driver's nested claims — add + remove, the INNER loop's mutations (entry
 * 6b), now carrying the same item-scoped windscreen-provider conditionality as
 * the top-level claim (entry 6c). The add form APPENDS at the nested path
 * `['drivers', d, 'claims']`, minting (drivers, d, claims, arrayIndex). It
 * reuses the claims feature's view-model builder + payload parser + validators
 * (`claimEntryModel`/`claimFromPayload`/`validateClaim`) and the claims entry
 * template — those are shared LOGIC + a value-domain, not a renderer: this
 * controller still chooses the template and calls `h.view` itself.
 */
const view = `${TEMPLATES}/features/claims/entry`

const driverPath = (request) => [
  'drivers',
  Number(request.params.driver),
  'claims'
]
const detailPath = (request) =>
  pagePath(`addons/named-driver/${Number(request.params.driver)}`)
const hubPath = pagePath('addons/named-driver')

/** The {driver} param as a valid in-range index, or null — so a malformed or
 * out-of-range URL redirects to the hub instead of writing through the generic
 * store primitive (which would otherwise fabricate a phantom driver on append). */
const validDriver = (request, answers) => {
  const d = Number(request.params.driver)
  const drivers = answers.drivers ?? []
  return Number.isInteger(d) && d >= 0 && d < drivers.length ? d : null
}

const render = (request, h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Add a claim', { backLink: detailPath(request) }),
    ...claimEntryModel(values, errors)
  })

const getAdd = (request, h) => {
  const { answers } = state.get(request, h)
  if (validDriver(request, answers) === null) return h.redirect(hubPath)
  return render(request, h, {
    claimType: '',
    claimAmount: '',
    windscreenProvider: ''
  })
}

const postAdd = (request, h) => {
  const { answers } = state.get(request, h)
  if (validDriver(request, answers) === null) return h.redirect(hubPath)
  const entry = claimFromPayload(request.payload ?? {})
  const { errors } = validateClaim(request.payload ?? {})
  if (errors) return render(request, h, entry, errors)

  state.appendEntryAt(request, h, driverPath(request), entry) // MINTS nested index
  return h.redirect(detailPath(request))
}

const getRemoveClaim = (request, h) => {
  const { answers } = state.get(request, h)
  if (validDriver(request, answers) === null) return h.redirect(hubPath)
  state.removeEntryAt(
    request,
    h,
    driverPath(request),
    Number(request.params.claim)
  )
  return h.redirect(detailPath(request))
}

const getRemoveDriver = (request, h) => {
  state.removeEntryAt(request, h, ['drivers'], Number(request.params.driver))
  return h.redirect(hubPath)
}

export const routes = [
  {
    method: 'GET',
    path: pagePath('addons/named-driver/{driver}/claims/add'),
    options: open,
    handler: getAdd
  },
  {
    method: 'POST',
    path: pagePath('addons/named-driver/{driver}/claims/add'),
    options: open,
    handler: postAdd
  },
  {
    method: 'GET',
    path: pagePath('addons/named-driver/{driver}/claims/{claim}/remove'),
    options: open,
    handler: getRemoveClaim
  },
  {
    method: 'GET',
    path: pagePath('addons/named-driver/{driver}/remove'),
    options: open,
    handler: getRemoveDriver
  }
]
