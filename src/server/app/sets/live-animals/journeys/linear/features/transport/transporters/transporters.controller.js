import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../../lib/http-status.js'
import {
  compose,
  oneOf,
  validate
} from '../../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as transporters from '../../../../../../../services/transporters/index.js'
import { organisationIdOf } from '../../../../../../../../common/helpers/organisation-id.js'
import { transporterAddPage, transportersPage as page } from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { transporterAnswer } from './transporter-record.js'
import { matchingTransporters, transporterRows } from './rows.js'

/** The transporter list — the journey's one transporter step.
 *
 * It declares all three transporter answers because picking a row settles all
 * of them: the record carries its own type, so the type is read off the pick
 * rather than asked in front of the list. The add spokes behind
 * "Add a transporter" write the same answers without declaring them, the way
 * the address pickers write the parties the addresses page declares. */
export const meta = {
  ...page,
  collects: ['transporterType', 'commercialTransporter', 'privateTransporter']
}
const view = `${TEMPLATES}/features/transport/transporters/transporters`

const copy = copyFor({ en, cy }).transporters

/** The transporters this organisation can pick — the ones it has added for
 * itself as well as the ones the service ships. Per-organisation, so it is read
 * per request rather than held at module load. */
const availableTransporters = (request) =>
  transporters.partiesFor(organisationIdOf(request))

/** A pick is valid when it is a row the page just rendered, which is why the
 * options are built from the list in hand rather than from a fixed set: a
 * transporter the organisation added is as pickable as one the service ships. */
const fieldsFor = (records) =>
  compose(
    oneOf(
      'transporter',
      records.map((option) => option.id),
      copy.errors.transporterRequired
    )
  )

/** The search button and the page's own submits share the one form, told apart
 * by their `action` value — the address picker's shape. */
const isSearchAction = (payload) => payload.action === 'search'

const render = (
  request,
  h,
  journey,
  values,
  { errors = {}, recoverableError = false } = {}
) => {
  const query = String(values.query ?? '')
  const rows = transporterRows(
    matchingTransporters(availableTransporters(request), query),
    { selectedId: values.selectedId }
  )
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey,
      page,
      recoverableError
    }),
    copy,
    errors,
    // A search that matches nothing leaves no radio for the summary to link
    // to, so the entry sends the trader to the only control they can act on —
    // the search box. The address picker switches its anchor the same way
    // (addresses/party-picker/view-model/error-summary.js).
    errorSummary: kit.errorSummary(errors, {
      href: (field) => (rows.length ? `#${field}` : '#search')
    }),
    // Reached from a Change link, the add route has to keep the context or
    // the trader is dropped into the journey instead of the summary.
    addHref: kit.withChangeContext(
      request,
      pagePath(journey.journeyId, transporterAddPage.slug)
    ),
    query,
    selectedId: values.selectedId,
    transporterRows: rows
  })
}

/** The record behind the answers already on the notification, so a returning
 * trader sees their pick still checked. Matched on name: the notification
 * stores the transporter's details, not the id of the row it came from.
 *
 * The match folds case and spacing the way the register does, so a record whose
 * spelling was corrected still resolves for a notification that recorded the
 * old one — re-adding a transporter overwrites its stored name, and an exact
 * match would leave the earlier notification with nothing checked. */
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
  const { journey, answers } = await state.get(request, h)
  return render(request, h, journey, {
    selectedId: selectedIdFor(request, answers)
  })
}

const commitOrSkip = (request, h, chosen) =>
  chosen
    ? state.commit(request, h, transporterAnswer(chosen))
    : state.get(request, h)

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const query = String(payload.search ?? '')

  // Searching filters the list in place: nothing is validated and nothing is
  // committed, and the row the trader had picked stays picked if the search
  // leaves it on the list.
  if (isSearchAction(payload)) {
    const { journey, answers } = await state.get(request, h)
    return render(request, h, journey, {
      query,
      selectedId:
        payload.transporter ||
        payload.selected ||
        selectedIdFor(request, answers)
    })
  }

  const records = availableTransporters(request)
  const { errors } = validate(fieldsFor(records), payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(request, h, journey, { query }, { errors })
  }

  const chosen = records.find((record) => record.id === payload.transporter)
  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await commitOrSkip(request, h, chosen)
    },
    async () => {
      const { journey } = await state.get(request, h)
      return render(
        request,
        h,
        journey,
        { selectedId: chosen?.id, query },
        { recoverableError: true }
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
