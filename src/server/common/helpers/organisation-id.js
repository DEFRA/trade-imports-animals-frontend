import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()

/** Verified organisation id on the session credential object (not the request). */
export const sessionOrganisationId = (credentials) => {
  if (!credentials) {
    return undefined
  }
  return credentials.organisationId ?? credentials.currentRelationshipId
}

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
 * Returns undefined when the request is unauthenticated. The value is
 * {@code credentials.organisationId} when set, otherwise
 * {@code credentials.currentRelationshipId} from the Defra ID session.
 */
export const organisationIdOf = (request) =>
  sessionOrganisationId(request?.auth?.credentials)

/** Test helper: sets AsyncLocalStorage for the rest of the async context via enterWith. */
export const enterOrganisationIdForTests = (organisationId) => {
  storage.enterWith(organisationId)
}

/** @deprecated Use enterOrganisationIdForTests in tests; production code uses withOrganisationId. */
export const bindOrganisationId = enterOrganisationIdForTests

export const currentOrganisationId = () => storage.getStore()

export const withOrganisationId = (organisationId, fn) =>
  storage.run(organisationId, fn)
