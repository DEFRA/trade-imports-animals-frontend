import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import {
  compose,
  dateParts,
  oneOf,
  validate
} from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as ports from '../../services/ports/index.js'
import { portOfEntryPage as page } from './page.js'
import { arrivalDateAtPort, portOfEntry } from './obligations.js'

// Explicit subset: the transport feature splits its obligations across the
// port-of-entry and transport-details pages.
export const meta = {
  ...page,
  collects: [portOfEntry.id, arrivalDateAtPort.id]
}
const view = `${TEMPLATES}/features/transport/port-of-entry`

const portItems = (selected) => [
  { value: '', text: 'Select port of entry' },
  { text: '──────────', disabled: true },
  ...ports.list().map((value) => ({
    value,
    text: value,
    selected: value === selected
  }))
]

// Both fields are enforcedAt=submit (V4 "Mandatory to submit"): blank passes
// validation and stays an open requirement for the status roll-up. Only an
// out-of-domain port or a partial/unreal date blocks the save. The date is
// arrival at the PORT of entry, not the final destination (spec ruling c-011).
const fields = compose(
  oneOf('portOfEntry', ports.list()),
  dateParts('arrivalDateAtPort', 'Enter a real arrival date')
)

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Port of entry', { backLink: hubPath() }),
    heading: 'Port of entry',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    portItems: portItems(values.portOfEntry),
    arrivalDate: kit.dateField('arrivalDateAtPort', {
      label: 'When will the consignment arrive at the port of entry?',
      hint: 'For example, 12 12 2026',
      value: values.arrivalDateAtPort ?? {},
      error: errors['arrivalDateAtPort-day']
    })
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, {
    portOfEntry: answers.portOfEntry ?? '',
    arrivalDateAtPort: answers.arrivalDateAtPort ?? {}
  })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    portOfEntry: payload.portOfEntry ?? '',
    arrivalDateAtPort: kit.readDate(payload, 'arrivalDateAtPort')
  }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, values, errors)

  const { scope } = state.commit(request, h, values)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
