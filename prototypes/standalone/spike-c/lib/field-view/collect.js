const FIELD_KIND_DATE = 'date'
const FIELD_KIND_CHECKBOXES = 'checkboxes'
const DATE_PARTS = ['day', 'month', 'year']

const collectDate = (name, payload) =>
  Object.fromEntries(
    DATE_PARTS.map((part) => [part, payload[`${name}-${part}`]])
  )

const collectCheckboxes = (name, payload) => {
  const raw = payload[name]
  return raw === undefined ? [] : [].concat(raw)
}

const collectField = (field, payload) => {
  if (field.kind === FIELD_KIND_DATE) {
    return collectDate(field.name, payload)
  }
  if (field.kind === FIELD_KIND_CHECKBOXES) {
    return collectCheckboxes(field.name, payload)
  }
  return payload[field.name]
}

/** Read submitted values for a list of specs back into a quote patch. */
export function collectFields(fields, payload) {
  return Object.fromEntries(
    fields.map((field) => [field.name, collectField(field, payload)])
  )
}
