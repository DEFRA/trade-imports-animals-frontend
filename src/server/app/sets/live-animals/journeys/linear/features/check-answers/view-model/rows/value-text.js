import { isBlank } from '../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'

const copy = copyFor({ en, cy })

const NOT_PROVIDED = copy.notProvided

export const toArray = (value) => [value ?? []].flat()

export const valueText = (value) => {
  if (isBlank(value)) {
    return NOT_PROVIDED
  }
  if (typeof value === 'number') {
    return value.toString()
  }
  return value
}

export const dateText = (value) =>
  isBlank(value) ? NOT_PROVIDED : `${value.day}/${value.month}/${value.year}`

export const escapeHtml = (value) =>
  value
    .toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
