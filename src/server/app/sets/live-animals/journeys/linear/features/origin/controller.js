import { dashboardPath, hubPath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { hasErrors } from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as countries from '../../../../../../services/countries/index.js'
import { hasCommittedNotificationAnswers } from '../../flow/entry-guard.js'
import { originPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { prefixFor, validation } from './validate.js'

export const meta = {
  ...page,
  collects: [
    'countryOfOrigin',
    'regionOfOriginCodeRequirement',
    'regionOfOriginCode',
    'internalReferenceNumber'
  ],
  validation
}
const view = `${TEMPLATES}/features/origin/template`

const copy = copyFor({ en, cy })

// The list feeds a type-ahead that enhances this select, so it carries only the
// placeholder and the real countries — a scroll-only list needed a divider rule
// under the placeholder, a searchable one does not.
const countryItems = async () => [
  { value: '', text: copy.country.placeholder },
  ...(await countries.originCountries())
]

// The back link is the one thing on this page told by what has been saved: a
// notification with nothing saved has no hub to go back to, so it goes to the
// dashboard instead. The status strip does not follow it — see `render`.
const backLinkFor = (journey, answers) =>
  hasCommittedNotificationAnswers(answers)
    ? hubPath(journey.journeyId)
    : dashboardPath()

// The journey always reaches the layout, so the status strip — the Draft tag
// and the notification reference — is drawn from the first request, matching
// every later page. The reference exists by then: starting a notification
// creates the record, and the user arrives here redirected under it.
const render = async (
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
      journey,
      page,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: await countryItems(),
    regionCodePrefix: prefixFor(values.countryOfOrigin)
  })

// The stored answers go back through the page's own rules on the way in, so a
// country the reference data has moved past is named here rather than
// surviving to the review page.
const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const { values, errors } = await validation.onStored(answers)
  return render(h, journey, values, errors, answers)
}

const post = async (request, h) => {
  const { values, answers, errors } = await validation.onSubmit(
    request.payload ?? {}
  )
  if (hasErrors(errors)) {
    const { journey, answers: storedAnswers } = await state.get(request, h)
    return (await render(h, journey, values, errors, storedAnswers)).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, answers)
    },
    async () => {
      const { journey, answers: storedAnswers } = await state.get(request, h)
      return (await render(h, journey, values, {}, storedAnswers, true)).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
    }
  )
  if (failure) {
    return failure
  }

  const { scope } = committed
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
