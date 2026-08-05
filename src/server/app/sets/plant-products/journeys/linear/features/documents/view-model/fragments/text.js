import { isBlank } from '../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as en } from '../../copy/copy.en.js'

const copy = copyFor({ en, cy })

// Every cell value leaves here as plain text so the table never renders markup
// the user supplied.
export const cellText = (value) =>
  String(value ?? '').trim() || copy.notProvided

export const dateText = (value) =>
  isBlank(value)
    ? copy.notProvided
    : `${value.day}/${value.month}/${value.year}`
