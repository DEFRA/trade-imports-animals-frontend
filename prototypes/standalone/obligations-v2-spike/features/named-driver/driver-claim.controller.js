import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, currency, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import { CLAIM_TYPE_OPTIONS } from '../claims/entry.controller.js'

/**
 * A driver's nested claims — add + remove, the INNER loop's mutations (entry
 * 6b). The add form APPENDS at the nested path `['drivers', d, 'claims']`, so
 * the identity minted is (drivers, d, claims, arrayIndex); remove destroys one
 * nested instance in place. Both go through the path-addressed store facade —
 * the same primitives the flat claims loop uses, now at depth. The claim entry
 * VIEW is reused verbatim from the top-level claims feature (identical fields);
 * only the collection path differs.
 */
const view = `${TEMPLATES}/features/claims/entry`

const fields = compose(
  oneOf(
    'claimType',
    CLAIM_TYPE_OPTIONS.map((o) => o.value)
  ),
  currency('claimAmount')
)

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
    heading: 'Add a claim',
    buttonText: 'Add claim',
    options: CLAIM_TYPE_OPTIONS.map((o) => ({
      ...o,
      checked: o.value === values.claimType
    })),
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const getAdd = (request, h) => {
  const { answers } = state.get(request, h)
  if (validDriver(request, answers) === null) return h.redirect(hubPath)
  return render(request, h, { claimType: '', claimAmount: '' })
}

const postAdd = (request, h) => {
  const { answers } = state.get(request, h)
  if (validDriver(request, answers) === null) return h.redirect(hubPath)
  const payload = request.payload ?? {}
  const entry = {
    claimType: payload.claimType ?? '',
    claimAmount: (payload.claimAmount ?? '').trim()
  }
  const { errors } = validate(fields, payload)
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
