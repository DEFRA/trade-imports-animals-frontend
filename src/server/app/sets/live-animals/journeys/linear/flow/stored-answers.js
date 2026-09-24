import { validationOf } from '../../../../../flow/dispatch.js'
import { hasErrors } from '../../../../../lib/validate/index.js'
import { taskRowById, taskRows } from './task-rows.js'

const NO_ERRORS = Object.freeze({})

/**
 * One task row's own stored-answer errors: each of its pages' validations,
 * read back over what is stored, merged into one `{ field: message }`. A row
 * whose pages carry no validation of their own, or whose stored answers still
 * pass every rule they have, returns nothing — the same `{}` `pageValidation`
 * itself uses for a clean read.
 */
export const rowStoredErrors = async (row, answers, context) => {
  let merged = NO_ERRORS
  for (const page of row.pages) {
    const validation = validationOf(page.id)
    if (!validation) {
      continue
    }
    const { errors } = await validation.onStored(answers, context)
    if (hasErrors(errors)) {
      merged = merged === NO_ERRORS ? errors : { ...merged, ...errors }
    }
  }
  return merged
}

/** The task-row ids whose stored answers no longer pass their own page's
 * rules — what the hub demotes back to "To do" however the engine still
 * counts them. */
export const invalidRowIds = async (answers, context) => {
  const invalid = new Set()
  for (const row of taskRows) {
    if (hasErrors(await rowStoredErrors(row, answers, context))) {
      invalid.add(row.id)
    }
  }
  return invalid
}

/** The review page's cards whose stored answers no longer pass their rows'
 * rules, keyed to the first message their rows produced — a card names one
 * broken answer, not every one behind it. */
export const cardStoredErrors = async (cards, answers, context) => {
  const result = {}
  for (const card of cards) {
    for (const rowId of card.rows) {
      const row = taskRowById(rowId)
      const errors = row
        ? await rowStoredErrors(row, answers, context)
        : NO_ERRORS
      const [message] = Object.values(errors)
      if (message) {
        result[card.id] = message
        break
      }
    }
  }
  return result
}
