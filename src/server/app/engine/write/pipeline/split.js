import { flowOnlyObligations } from '../../../bridge/obligation-source.js'
import { hasOwn } from './predicates.js'

export const splitPatch = (patch) => {
  const flowOnlyKeys = flowOnlyObligations()
  const flowOnly = Object.fromEntries(
    flowOnlyKeys
      .filter((key) => hasOwn(patch, key))
      .map((key) => [key, patch[key]])
  )
  const canonical = Object.fromEntries(
    Object.entries(patch).filter(([key]) => !flowOnlyKeys.includes(key))
  )
  return { canonical, flowOnly }
}
