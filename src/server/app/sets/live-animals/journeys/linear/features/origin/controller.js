import { dashboardPath, hubPath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  compose,
  maxText,
  oneOf,
  pattern,
  requiredOneOf,
  validate
} from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as countries from '../../../../../../services/countries/index.js'
import { hasCommittedNotificationAnswers } from '../../flow/entry-guard.js'
import { nextRunTarget } from '../../flow/run.js'
import {
  beginOpeningRun,
  openingRunStarted
} from '../../../../../../flow/run-state.js'
import { originPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

export const meta = {
  ...page,
  collects: [
    'countryOfOrigin',
    'regionOfOriginCodeRequirement',
    'regionOfOriginCode',
    'internalReferenceNumber'
  ]
}
const view = `${TEMPLATES}/features/origin/template`

const copy = copyFor({ en, cy })

const REGION_CODE_MAX_LENGTH = 5
const INTERNAL_REFERENCE_MAX_LENGTH = 58

const FIELD_ORDER = [
  'countryOfOrigin',
  'regionOfOriginCodeRequirement',
  'regionOfOriginCode',
  'internalReferenceNumber'
]

const valuesFrom = (source, { trim = [] } = {}) =>
  Object.fromEntries(
    FIELD_ORDER.map((field) => [
      field,
      trim.includes(field)
        ? (source[field] ?? '').trim()
        : (source[field] ?? '')
    ])
  )

const countryItems = () => [
  { value: '', text: copy.country.placeholder },
  { value: '', text: '──────────', disabled: true },
  ...countries.originCountries()
]

const fields = () =>
  compose(
    requiredOneOf(
      'countryOfOrigin',
      countries.originCountries().map(({ value }) => value),
      copy.errors.countryRequired
    ),
    oneOf('regionOfOriginCodeRequirement', ['yes', 'no']),
    maxText(
      'regionOfOriginCode',
      REGION_CODE_MAX_LENGTH,
      copy.errors.regionCodeMaxLength
    ),
    maxText(
      'internalReferenceNumber',
      INTERNAL_REFERENCE_MAX_LENGTH,
      copy.errors.internalReferenceMaxLength
    ),
    pattern(
      'internalReferenceNumber',
      /^\w*$/,
      copy.errors.internalReferencePattern
    )
  )

const journeyIfStarted = (journey, answers) =>
  hasCommittedNotificationAnswers(answers) ? journey : undefined

/** The entry page's back link leaves the journey until the journey has
 * started — the hub is still behind the entry guard at that point. */
const backLinkFor = (journey, answers) =>
  hasCommittedNotificationAnswers(answers)
    ? hubPath(journey.journeyId)
    : dashboardPath()

/** Origin is the journey's entry page, so its save is what opens the opening
 * run — but only for a journey that is genuinely fresh. A journey that already
 * has a run record, or that already carries committed answers from an earlier
 * session, keeps the sequencing it has. */
const shouldOpenRun = async (request, answersBeforeCommit) =>
  !(await openingRunStarted(request, request.params.journeyId)) &&
  !hasCommittedNotificationAnswers(answersBeforeCommit)

const render = (
  h,
  journey,
  values,
  errors = {},
  answers = values,
  recoverableError = false
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: backLinkFor(journey, answers),
      journey: journeyIfStarted(journey, answers),
      journeyId: journey.journeyId,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: countryItems()
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, valuesFrom(answers), {}, answers)
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = valuesFrom(payload, {
    trim: ['regionOfOriginCode', 'internalReferenceNumber']
  })
  const { errors } = validate(fields(), payload)
  if (errors) {
    const { journey, answers } = await state.get(request, h)
    return render(h, journey, values, errors, answers).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const { answers: answersBeforeCommit } = await state.get(request, h)

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, values)
    },
    async () => {
      const { journey, answers } = await state.get(request, h)
      return render(h, journey, values, {}, answers, true).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
    }
  )
  if (failure) {
    return failure
  }

  const { scope } = committed
  if (await shouldOpenRun(request, answersBeforeCommit)) {
    await beginOpeningRun(request, h, request.params.journeyId)
    return h.redirect(
      kit.exitTarget(
        request,
        nextRunTarget(page.id, scope, request.params.journeyId)
      )
    )
  }
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
