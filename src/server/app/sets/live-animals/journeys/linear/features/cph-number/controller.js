import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  compose,
  requiredExactDigits,
  validate
} from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as commodities from '../../../../services/commodities/index.js'
import { cphNumberPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

export const meta = { ...page, collects: ['countyParishHoldingCph'] }
const view = `${TEMPLATES}/features/cph-number/template`

const copy = copyFor({ en, cy })

const asArray = (value) => [value ?? []].flat()

export const isCphApplicable = (answers) =>
  asArray(answers.commodityLines).some((line) =>
    commodities.cphCommodities().includes(line?.commoditySelection)
  )

// A county parish holding number is two digits of county, three of parish and
// four of holding. The page asks for the three parts separately so an error can
// name the part that is wrong; the stored answer stays the nine bare digits the
// backend already receives, so the wire contract does not move.
const COUNTY_FIELD = 'cphCounty'
const PARISH_FIELD = 'cphParish'
const HOLDING_FIELD = 'cphHolding'

const COUNTY_DIGITS = 2
const PARISH_DIGITS = 3
const HOLDING_DIGITS = 4

const PART_ORDER = [
  [COUNTY_FIELD, COUNTY_DIGITS],
  [PARISH_FIELD, PARISH_DIGITS],
  [HOLDING_FIELD, HOLDING_DIGITS]
]

const fields = compose(
  requiredExactDigits(COUNTY_FIELD, COUNTY_DIGITS, {
    required: copy.errors.countyRequired,
    length: copy.errors.countyLength,
    digitsOnly: copy.errors.countyDigitsOnly
  }),
  requiredExactDigits(PARISH_FIELD, PARISH_DIGITS, {
    required: copy.errors.parishRequired,
    length: copy.errors.parishLength,
    digitsOnly: copy.errors.parishDigitsOnly
  }),
  requiredExactDigits(HOLDING_FIELD, HOLDING_DIGITS, {
    required: copy.errors.holdingRequired,
    length: copy.errors.holdingLength,
    digitsOnly: copy.errors.holdingDigitsOnly
  })
)

const readParts = (payload) =>
  Object.fromEntries(
    PART_ORDER.map(([part]) => [part, String(payload[part] ?? '').trim()])
  )

// A stored answer is nine bare digits, but a seeded or legacy one can carry the
// slashes a trader used to type, so the split reads digits only.
const splitStored = (stored) => {
  const digits = String(stored ?? '').replace(/\D/g, '')
  let taken = 0
  return Object.fromEntries(
    PART_ORDER.map(([part, count]) => {
      const slice = digits.slice(taken, taken + count)
      taken += count
      return [part, slice]
    })
  )
}

const joinParts = (parts) => PART_ORDER.map(([part]) => parts[part]).join('')

const isBlankSubmit = (parts) =>
  PART_ORDER.every(([part]) => parts[part] === '')

// A trader who submits the page untouched has not got three problems, they have
// one — so the empty page answers with the whole question, at the first box.
const partErrors = (parts) =>
  isBlankSubmit(parts)
    ? { [COUNTY_FIELD]: copy.errors.cphRequired }
    : validate(fields, parts).errors

const hubEntryReturn = (request) =>
  request.query.return === 'addresses'
    ? pagePath(request.params.journeyId, 'addresses')
    : null

const render = (
  request,
  h,
  journey,
  values,
  { errors = {}, recoverableError = false } = {}
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubEntryReturn(request) ?? hubPath(journey.journeyId),
      journey,
      page,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(
    request,
    h,
    journey,
    splitStored(answers.countyParishHoldingCph)
  )
}

const post = async (request, h) => {
  const parts = readParts(request.payload ?? {})
  const errors = partErrors(parts)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(request, h, journey, parts, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const values = { countyParishHoldingCph: joinParts(parts) }
  const { failure, value: committed } = await kit.recoverableSave(
    () => state.commit(request, h, values),
    async () => {
      const { journey } = await state.get(request, h)
      return render(request, h, journey, parts, {
        recoverableError: true
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  )
  if (failure) {
    return failure
  }

  const { scope } = committed
  return h.redirect(
    kit.hubExitTarget(request) ??
      hubEntryReturn(request) ??
      (await kit.nextTarget(request, page, scope))
  )
}

export const routes = kit.pageRoutes(page, { get, post })
