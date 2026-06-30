const collectFieldValue = (field, payload) => {
  if (field.kind === 'date') {
    return {
      day: payload[`${field.name}-day`],
      month: payload[`${field.name}-month`],
      year: payload[`${field.name}-year`]
    }
  }
  if (field.kind === 'checkboxes') {
    const raw = payload[field.name]
    return raw === undefined ? [] : [].concat(raw)
  }
  return payload[field.name]
}

/** Read submitted values for a list of specs back into a quote patch. */
export function collectFields(fields, payload) {
  return Object.fromEntries(
    fields.map((field) => [field.name, collectFieldValue(field, payload)])
  )
}
