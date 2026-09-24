import { validate } from './run.js'

const NO_ERRORS = Object.freeze({})

/** True when a validation found anything to say. */
export const hasErrors = (errors) => Object.keys(errors).length > 0

/**
 * One page's validation, stated once.
 *
 * A page asks its questions twice over: of a form the trader has just
 * submitted, and of the answers already stored — when the page is opened
 * again, on the task list, and on the review page. The second reading is not
 * decoration. An answer given a fortnight ago was measured against the rules
 * and the reference data of a fortnight ago, and a port that has closed since
 * is something the trader has to be told about before they submit.
 *
 * Both readings run the same rules over the same field set, so what counts as
 * a valid answer is written in one place and the two cannot drift. Which
 * reading is running is passed to the rules as `stored`, because the same
 * broken rule is told differently to a trader who has just made a mistake and
 * to one who made none: "Select a port from the list" is right the moment a
 * form arrives with a port that is not on it, and wrong a fortnight later.
 *
 * Errors come back keyed by the page's own field names — what `render` already
 * takes — so a caller on either path passes them straight through.
 *
 * @param {object} page
 * @param {Function} page.fields - `(values, context) => schema`, possibly
 * async. The rules, keyed by field name.
 * @param {Function} [page.checks] - `(values, context) => errors`, possibly
 * async. What no schema can state — a reference that no longer resolves, a
 * cap on a list. A field the schema has already failed keeps the schema's
 * message.
 * @param {Function} [page.normalise] - `(values) => values`. The values as the
 * rules read them, where that differs from the values the page renders back.
 * @param {Function} page.fromPayload - `(payload) => values`. The page reading
 * a submitted form.
 * @param {Function} page.fromAnswers - `(answers) => values`. The page reading
 * what is stored.
 * @param {Function} [page.toAnswers] - `(values) => answers`. What a valid form
 * commits. Defaults to the values themselves.
 * @param {Function} [page.blanks] - `(field) => [fieldName, ...]`. The fields a
 * page must not render back once the given field's stored value has been
 * rejected — itself by default. Applied only on the stored reading: a trader
 * who has just typed something wrong keeps seeing what they typed, but a
 * control opened on a value the rules have since rejected must not hold it.
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

    /** A submitted form: the values to render back, the answers a clean form
     * would commit, and what is wrong with it. */
    onSubmit: async (payload, context = {}) => {
      const values = fromPayload(payload)
      return {
        values,
        answers: toAnswers(values),
        errors: await errorsIn(values, { ...context, stored: false })
      }
    },

    /** Stored answers, read back through the same rules. A field the rules
     * reject is blanked in the returned `values`, along with whatever else
     * `blanks` says depends on it, so the caller has values already safe to
     * render. */
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
