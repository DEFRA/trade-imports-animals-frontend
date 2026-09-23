import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()
const mounts = new Map()

export const registerSetMount = (setId, prefix) => {
  if (!prefix?.startsWith('/')) {
    throw new Error(`Set "${setId}" needs a mount prefix`)
  }
  mounts.set(setId, prefix)
}

export const mountedSetIds = () => [...mounts.keys()]

/**
 * Which set a request path belongs to, read off the registered mounts.
 *
 * Longest match wins, so a set mounted at `/live-animals/extra` would beat one
 * at `/live-animals` rather than depending on registration order.
 *
 * @param {string} [path] - the request path.
 * @returns {string|undefined} the set id, or undefined where the path is
 * outside every mount — `/health`, `/signout`, `/auth/*`, or a genuinely
 * unrouted URL.
 */
export const setIdForPath = (path) => {
  if (typeof path !== 'string') {
    return undefined
  }
  let match
  for (const [setId, prefix] of mounts) {
    const under = path === prefix || path.startsWith(`${prefix}/`)
    if (under && (!match || prefix.length > mounts.get(match).length)) {
      match = setId
    }
  }
  return match
}

const soleSetId = () => (mounts.size === 1 ? [...mounts.keys()][0] : undefined)

export const currentSetId = () => {
  const id = storage.getStore()?.setId ?? soleSetId()
  if (!id) {
    // Naming the mounted sets separates the two ways this fires: nothing has
    // booted yet, or several sets are mounted and the caller is outside any
    // request's context.
    throw new Error(
      `No set context — no active set, and ${
        mounts.size === 0
          ? 'no set is mounted'
          : `${mounts.size} sets are mounted (${mountedSetIds().join(', ')})`
      }`
    )
  }
  return id
}

export const currentSetBase = () =>
  // Defensive default only: registered sets never have an empty prefix;
  // `''` means an active set id has no registered mount, not a root-mounted set.
  mounts.get(currentSetId()) ?? ''

export const withSetContext = (setId, fn) => storage.run({ setId }, fn)

export const enterSetContext = (setId) => storage.enterWith({ setId })

/**
 * Server-wide set context, registered once by the composition root.
 *
 * Each set's own sandboxed `onPreAuth` enters the context for that set's
 * routes, but a request can need the context where no set route runs: the
 * shared error page on an unrouted path, and hapi-vision's marshal step, which
 * runs after the handler's context has gone. Resolving the set from the path
 * before routing covers both without any set owning server-wide state.
 */
export const setContextExtension = {
  type: 'onRequest',
  method: (request, h) => {
    const setId = setIdForPath(request.path)
    if (setId) {
      enterSetContext(setId)
    }
    return h.continue
  }
}

const contextualMethod = (setId, method) =>
  typeof method === 'function'
    ? (request, h) => withSetContext(setId, () => method(request, h))
    : method

/**
 * Wraps whatever shape a route's lifecycle entry takes — a bare function, an
 * object carrying `method`, or an array of either. Route `ext` points and
 * `pre` entries both use this grammar, so both go through here.
 */
const contextualEntry = (setId, entry) => {
  if (Array.isArray(entry)) {
    return entry.map((item) => contextualEntry(setId, item))
  }
  if (typeof entry === 'function') {
    return contextualMethod(setId, entry)
  }
  return {
    ...entry,
    method: contextualMethod(setId, entry.method)
  }
}

const contextualOptions = (setId, options) => {
  const { ext, handler, pre } = options
  return {
    ...options,
    ...(ext && {
      ext: Object.fromEntries(
        Object.entries(ext).map(([point, extension]) => [
          point,
          contextualEntry(setId, extension)
        ])
      )
    }),
    // `options.handler` is the same handler by another name, and `options.pre`
    // runs before it. Both would otherwise resolve whichever set happened to be
    // ambient, so both are wrapped the way `route.handler` is.
    ...(handler && { handler: contextualMethod(setId, handler) }),
    ...(pre && { pre: contextualEntry(setId, pre) })
  }
}

export const routeWithSetContext = (setId, route) => ({
  ...route,
  ...(route.options && { options: contextualOptions(setId, route.options) }),
  ...(route.handler && { handler: contextualMethod(setId, route.handler) })
})

export const setKeyed = (label) => {
  const bySet = new Map()
  return {
    configure: (setId, value) => bySet.set(setId, value),
    current: () => {
      const setId = currentSetId()
      if (!bySet.has(setId)) {
        throw new Error(`${label} not configured for set "${setId}"`)
      }
      return bySet.get(setId)
    },
    has: (setId) => bySet.has(setId)
  }
}
