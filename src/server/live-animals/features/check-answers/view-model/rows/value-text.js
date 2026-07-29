import { isBlank } from '../../../../lib/answered.js'
import { copyFor } from '../../../../shared/copy.js'
import { copy as en } from '../../copy.en.js'
import { copy as cy } from '../../copy.cy.js'

const copy = copyFor({ en, cy })

const NOT_PROVIDED = copy.notProvided

export const toArray = (value) => [].concat(value ?? [])

export const valueText = (value) =>
  isBlank(value)
    ? NOT_PROVIDED
    : typeof value === 'number'
      ? value.toString()
      : value

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
