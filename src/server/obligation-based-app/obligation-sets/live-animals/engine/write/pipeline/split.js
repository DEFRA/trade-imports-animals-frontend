import { FLOW_ONLY_OBLIGATIONS } from '../../../bridge/obligation-source.js'
import { hasOwn } from './predicates.js'

export const splitPatch = (patch) => {
  const flowOnly = Object.fromEntries(
    FLOW_ONLY_OBLIGATIONS.filter((key) => hasOwn(patch, key)).map((key) => [
      key,
      patch[key]
    ])
  )
  const canonical = Object.fromEntries(
    Object.entries(patch).filter(
      ([key]) => !FLOW_ONLY_OBLIGATIONS.includes(key)
    )
  )
  return { canonical, flowOnly }
}
