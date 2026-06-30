/** Read submitted values for a list of specs back into a quote patch. */
export function collectFields(fields, payload) {
  const data = {}
  for (const field of fields) {
    if (field.kind === 'date') {
      data[field.name] = {
        day: payload[`${field.name}-day`],
        month: payload[`${field.name}-month`],
        year: payload[`${field.name}-year`]
      }
    } else if (field.kind === 'checkboxes') {
      const raw = payload[field.name]
      data[field.name] = raw === undefined ? [] : [].concat(raw)
    } else {
      data[field.name] = payload[field.name]
    }
  }
  return data
}
