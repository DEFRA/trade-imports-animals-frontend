import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()

export const sessionOrganisationId = (credentials) =>
  credentials?.organisationId

/** Owning organisation on the verified session, or undefined when unauthenticated. */
export const organisationIdOf = (request) =>
  sessionOrganisationId(request?.auth?.credentials)

export const currentOrganisationId = () => storage.getStore()

export const withOrganisationId = (organisationId, fn) =>
  storage.run(organisationId, fn)
