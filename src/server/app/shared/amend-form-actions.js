const CHANGE_FLAG = 'change'
const GET_ONLY_FLAGS = ['staleAction']

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
 * The two form actions an amend page's save buttons carry, so a button can send
 * the page's own form somewhere other than the URL it was opened at without
 * posting a new field. "Save and return" goes to the real service's own
 * `?change=1` return; "Save and continue" posts without it, so it always goes
 * on.
 *
 * @param {string} path - the path of the page being rendered.
 * @param {URLSearchParams} [searchParams] - the page's own query, kept on both.
 * @returns {{ returnAction: string, continueAction: string }} the two URLs.
 */
export const amendFormActions = (path, searchParams) => {
  const returnQuery = queryWithout(searchParams)
  returnQuery.set(CHANGE_FLAG, '1')
  const continueQuery = queryWithout(searchParams)
  continueQuery.delete(CHANGE_FLAG)
  return {
    returnAction: withQuery(path, returnQuery),
    continueAction: withQuery(path, continueQuery)
  }
}
