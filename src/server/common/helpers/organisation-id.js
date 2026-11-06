import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()

/** The organisation the signed-in user is acting for on this request.
 *
 * The one place this value is read. It is forwarded to services that scope on
 * the organisation — the address book directly, and the backend, which passes
 * it on to the address book in turn — and those services treat it as the
 * authenticated organisation rather than checking it themselves. So it must
 * always come from the verified session and never from a payload, a query
 * string or a stored field: forwarding a verified value is a pass-through,
 * anything else is asserting an identity.
 *
 * Returns undefined when the request is unauthenticated. Callers decide what
 * that means for them; none of them may substitute a guess.
 */
export const organisationIdOf = (request) => {
  const credentials = request?.auth?.credentials
  if (!credentials) {
    return undefined
  }
  return credentials.organisationId ?? credentials.currentRelationshipId
}

/** Bind the verified organisation for outbound backend calls in this request. */
export const bindOrganisationId = (organisationId) => {
  storage.enterWith(organisationId)
}

export const currentOrganisationId = () => storage.getStore()

export const withOrganisationId = (organisationId, fn) =>
  storage.run(organisationId, fn)
