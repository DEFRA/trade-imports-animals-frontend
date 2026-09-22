import { currentSetId, setKeyed } from '../shared/set-context.js'

// Optional set-owned sanitiser for answers on the read path. Default is identity;
// each set's gateway configures its own clearer so deleted address-book references
// drop out of fulfilment/evaluation without engine importing sets/**.

const identity = async (_request, answers) => answers

const store = setKeyed('Answers-for-read sanitiser')

export const configureAnswersForRead = (setId, sanitize) => {
  store.configure(setId, sanitize)
}

// A set that configures no sanitiser reads its answers unchanged, so this
// resolves to the default rather than throwing the way a required seam does.
const sanitizeAnswersForRead = () =>
  store.has(currentSetId()) ? store.current() : identity

export const answersForRead = (request, answers) =>
  sanitizeAnswersForRead()(request, answers)
