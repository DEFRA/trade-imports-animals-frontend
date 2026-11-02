import { flowOnlyKeys } from '../../../bridge/flow-only-keys.js'
import { hasOwn } from './predicates.js'

export const splitPatch = (patch) => {
  const flowOnlyKeyList = flowOnlyKeys()
  const flowOnly = Object.fromEntries(
    flowOnlyKeyList
      .filter((key) => hasOwn(patch, key))
      .map((key) => [key, patch[key]])
  )
  const canonical = Object.fromEntries(
    Object.entries(patch).filter(([key]) => !flowOnlyKeyList.includes(key))
  )
  return { canonical, flowOnly }
}
