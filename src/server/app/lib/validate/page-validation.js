import { validate } from './run.js'

const NO_ERRORS = Object.freeze({})

/** True when a validation found anything to say. */
export const hasErrors = (errors) => Object.keys(errors).length > 0

/**
 * One page's validation, stated once, read against two audiences: a form the
 * trader has just submitted, and the answers already stored (task list,
 * review page). Same rules, same field set — what counts as a valid answer
 * cannot drift. Which reading is running is passed to the rules as `stored`,
 * so the same broken rule can be told differently: "Select a port from the
 * list" is right for a trader who just mistyped, wrong for one whose stored
 * port has since closed. Errors come back keyed by the page's own field names.
 *
 * @param {object} page
 * @param {Function} page.fields - `(values, context) => schema`. Rules keyed by field name.
 * @param {Function} [page.checks] - `(values, context) => errors`. What no schema states — a live-catalogue lookup, a cap on a list. A field the schema already failed keeps the schema's message.
 * @param {Function} [page.normalise] - `(values) => values`. The values as the rules read them, where that differs from the values the page renders back.
 * @param {Function} page.fromPayload - `(payload) => values`. Reading a submitted form.
 * @param {Function} page.fromAnswers - `(answers) => values`. Reading what is stored.
 * @param {Function} [page.toAnswers] - `(values) => answers`. What a valid form commits. Defaults to the values themselves.
 * @param {Function} [page.blanks] - `(field) => [fieldName, ...]`. Fields to blank when the given field's stored value is rejected — itself by default. Applied only on the stored reading; onSubmit never blanks so a trader keeps seeing what they typed.
 */
export const pageValidation = ({
  fields,
  checks,
  normalise = (values) => values,
  fromPayload,
  fromAnswers,
  toAnswers = (values) => values,
  blanks = (field) => [field]
}) => {
  const errorsIn = async (values, context) => {
    const measured = normalise(values)
    const { errors } = validate(await fields(measured, context), measured)
    return { ...(await checks?.(measured, context)), ...(errors ?? NO_ERRORS) }
  }

  return {
    fromPayload,
    fromAnswers,

    onSubmit: async (payload, context = {}) => {
      const values = fromPayload(payload)
      return {
        values,
        answers: toAnswers(values),
        errors: await errorsIn(values, { ...context, stored: false })
      }
    },

    onStored: async (answers, context = {}) => {
      const values = fromAnswers(answers)
      const errors = await errorsIn(values, { ...context, stored: true })
      for (const field of Object.keys(errors)) {
        for (const blanked of blanks(field)) {
          values[blanked] = ''
        }
      }
      return { values, errors }
    }
  }
}
