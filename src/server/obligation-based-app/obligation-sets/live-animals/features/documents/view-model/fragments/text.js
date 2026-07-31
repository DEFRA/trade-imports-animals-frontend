import { isBlank } from '../../../../lib/answered.js'
import { copyFor } from '../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'

const copy = copyFor({ en, cy })

const NOT_PROVIDED = copy.notProvided

export const cellText = (value) => (value ?? '').trim() || NOT_PROVIDED

export const dateText = (value) =>
  isBlank(value) ? NOT_PROVIDED : `${value.day}/${value.month}/${value.year}`
