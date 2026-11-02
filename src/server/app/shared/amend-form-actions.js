const CHANGE_FLAG = 'change'
const GET_ONLY_FLAGS = ['staleAction']

export const AMEND_RETURN_CHOICE = Object.freeze({
  name: 'amendSave',
  value: 'return'
})

const withQuery = (path, query) => {
  const text = query.toString()
  return text === '' ? path : `${path}?${text}`
}

const queryWithout = (searchParams) => {
  const query = new URLSearchParams(searchParams ?? '')
  GET_ONLY_FLAGS.forEach((flag) => query.delete(flag))
  return query
}

/**
 * What an amend page's save buttons carry. "Save and return" posts with
 * `?change=1` and "Save and continue" posts without it, so the page's own form
 * can be sent from either button to the URL it was opened at, and the two
 * buttons tell themselves apart by that URL.
 *
 * @param {string} path - the path of the page being rendered.
 * @param {URLSearchParams} [searchParams] - the page's own query, kept on both.
 * @returns {{ returnAction: string, continueAction: string, returnChoice: { name: string, value: string } }}
 *   the two URLs, and the name and value the amend "Save and return" submits.
 */
export const amendFormActions = (path, searchParams) => {
  const returnQuery = queryWithout(searchParams)
  returnQuery.set(CHANGE_FLAG, '1')
  const continueQuery = queryWithout(searchParams)
  continueQuery.delete(CHANGE_FLAG)
  return {
    returnAction: withQuery(path, returnQuery),
    continueAction: withQuery(path, continueQuery),
    returnChoice: AMEND_RETURN_CHOICE
  }
}
