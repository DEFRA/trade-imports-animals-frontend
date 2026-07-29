import { FLOW_ONLY_OBLIGATIONS } from '../../../bridge/obligation-source.js'
import { hasOwn } from './predicates.js'

export const splitPatch = (patch) => {
  const canonical = { ...patch }
  const flowOnly = {}
  for (const key of FLOW_ONLY_OBLIGATIONS) {
    if (!hasOwn(canonical, key)) continue
    flowOnly[key] = canonical[key]
    delete canonical[key]
  }
  return { canonical, flowOnly }
}
