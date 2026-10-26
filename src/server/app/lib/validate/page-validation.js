import { validate } from './run.js'

const NO_ERRORS = Object.freeze({})

const checkOutcomeOf = (checked) =>
  checked && 'errors' in checked ? checked : { errors: checked }

/** True when a validation found anything to say. */
export const hasErrors = (errors) => Object.keys(errors).length > 0

/**
 * One page's validation: `onSubmit` reads a submitted form and `onStored`
 * reads the stored answers, both against the same rules. Errors come back
 * keyed by the page's own field names.
 *
 * @param {object} page
 * @param {Function} page.fields - `(values, context) => schema`. Rules keyed by field name.
 * @param {Function} [page.checks] - `(values, context) => errors | { errors, refusal }`. What no schema states — a live-catalogue lookup, a cap on a list. Returns either a plain errors object, or `{ errors, refusal }` where `refusal` is the named reason (and any ids) the page logs and `onSubmit`/`onStored` pass through on their result. A field the schema already failed keeps the schema's message.
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
  const outcomeIn = async (values, context) => {
    const measured = normalise(values)
    const { errors } = validate(await fields(measured, context), measured)
    const checked = checkOutcomeOf(await checks?.(measured, context))
    return {
      errors: { ...checked.errors, ...(errors ?? NO_ERRORS) },
      ...(checked.refusal && { refusal: checked.refusal })
    }
  }

  return {
    fromPayload,
    fromAnswers,

    onSubmit: async (payload, context = {}) => {
      const values = fromPayload(payload)
      return {
        values,
        answers: toAnswers(values),
        ...(await outcomeIn(values, { ...context, stored: false }))
      }
    },

    onStored: async (answers, context = {}) => {
      const values = fromAnswers(answers)
      const outcome = await outcomeIn(values, { ...context, stored: true })
      for (const field of Object.keys(outcome.errors)) {
        for (const blanked of blanks(field)) {
          values[blanked] = ''
        }
      }
      return { values, ...outcome }
    }
  }
}
