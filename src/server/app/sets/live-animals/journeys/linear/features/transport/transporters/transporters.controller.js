import { pagePath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import { hasErrors } from '../../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as transporters from '../../../../../../../services/transporters/index.js'
import { organisationIdOf } from '../../../../../../../../common/helpers/organisation-id.js'
import { transporterAddPage, transportersPage as page } from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { transporterAnswer } from './transporter-record.js'
import {
  matchingTransporters,
  shownCountMessages,
  transporterRows,
  transporterTableRows
} from './rows.js'
import { validation } from './validate.js'

export const meta = {
  ...page,
  collects: ['transporterType', 'commercialTransporter', 'privateTransporter'],
  validation
}
const view = `${TEMPLATES}/features/transport/transporters/transporters`

const copy = copyFor({ en, cy }).transporters

const availableTransporters = (request) =>
  transporters.partiesFor(organisationIdOf(request))

const isSearchAction = (payload) => payload.action === 'search'

const render = async (
  request,
  h,
  current,
  values,
  { errors = {}, recoverableError = false } = {}
) => {
  const { journey } = current
  const query = String(values.query ?? '')
  const available = availableTransporters(request)
  const rows = transporterRows(
    matchingTransporters(available, String(values.narrowBy ?? '')),
    { selectedId: values.selectedId }
  )
  const queryMatchesNothing =
    matchingTransporters(available, query).length === 0
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: await kit.runBackLink(request, page.id, current),
      journey,
      page,
      recoverableError
    }),
    copy,
    errors,
    errorSummary: kit.errorSummary(errors, {
      href: (field) => (queryMatchesNothing ? '#search' : `#${field}`)
    }),
    addHref: kit.withChangeContext(
      request,
      pagePath(journey.journeyId, transporterAddPage.slug)
    ),
    query,
    selectedId: values.selectedId,
    shownMessages: shownCountMessages(rows.length),
    transporterRows: rows,
    transporterTableRows: transporterTableRows(rows)
  })
}

const selectedIdFor = (request, answers) => {
  const chosenName =
    answers.commercialTransporter?.name ?? answers.privateTransporter?.name
  if (!chosenName) {
    return undefined
  }
  const chosenKey = transporters.nameKey(chosenName)
  return availableTransporters(request).find(
    (option) => transporters.nameKey(option.name) === chosenKey
  )?.id
}

const get = async (request, h) => {
  const current = await state.get(request, h)
  const { answers, storedAnswers } = current
  const { errors } = await validation.onStored(answers, {
    request,
    storedAnswers
  })
  return render(
    request,
    h,
    current,
    { selectedId: selectedIdFor(request, answers) },
    { errors }
  )
}

const commitOrSkip = (request, h, chosen) =>
  chosen
    ? state.commit(request, h, transporterAnswer(chosen))
    : state.get(request, h)

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const query = String(payload.search ?? '')

  if (isSearchAction(payload)) {
    const current = await state.get(request, h)
    return render(request, h, current, {
      query,
      narrowBy: query,
      selectedId:
        payload.transporter ||
        payload.selected ||
        selectedIdFor(request, current.answers)
    })
  }

  const records = availableTransporters(request)
  const { errors } = await validation.onSubmit(payload, { records })
  if (hasErrors(errors)) {
    const current = await state.get(request, h)
    return (
      await render(request, h, current, { query, narrowBy: query }, { errors })
    ).code(HTTP_STATUS_BAD_REQUEST)
  }

  const chosen = records.find((record) => record.id === payload.transporter)
  const { value: committed, failure } = await kit.recoverableSave(
    request,
    () => commitOrSkip(request, h, chosen),
    async () => {
      const current = await state.get(request, h)
      return (
        await render(
          request,
          h,
          current,
          { selectedId: chosen?.id, query, narrowBy: query },
          { recoverableError: true }
        )
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  )
  if (failure) {
    return failure
  }

  const { scope } = committed
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
