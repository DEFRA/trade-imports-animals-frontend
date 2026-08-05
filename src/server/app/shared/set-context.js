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

const soleSetId = () => (mounts.size === 1 ? [...mounts.keys()][0] : undefined)

export const currentSetId = () => {
  const id = storage.getStore()?.setId ?? soleSetId()
  if (!id) {
    throw new Error('No set context — no active set and more than one mounted')
  }
  return id
}

export const currentSetBase = () =>
  // Defensive default only: registered sets never have an empty prefix;
  // `''` means an active set id has no registered mount, not a root-mounted set.
  mounts.get(currentSetId()) ?? ''

export const withSetContext = (setId, fn) => storage.run({ setId }, fn)

export const enterSetContext = (setId) => storage.enterWith({ setId })

const contextualMethod = (setId, method) =>
  typeof method === 'function'
    ? (request, h) => withSetContext(setId, () => method(request, h))
    : method

const contextualExtension = (setId, extension) => {
  if (Array.isArray(extension)) {
    return extension.map((item) => contextualExtension(setId, item))
  }
  if (typeof extension === 'function') {
    return contextualMethod(setId, extension)
  }
  return {
    ...extension,
    method: contextualMethod(setId, extension.method)
  }
}

export const routeWithSetContext = (setId, route) => {
  const ext = route.options?.ext
  return {
    ...route,
    ...(ext && {
      options: {
        ...route.options,
        ext: Object.fromEntries(
          Object.entries(ext).map(([point, extension]) => [
            point,
            contextualExtension(setId, extension)
          ])
        )
      }
    }),
    handler: contextualMethod(setId, route.handler)
  }
}

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
