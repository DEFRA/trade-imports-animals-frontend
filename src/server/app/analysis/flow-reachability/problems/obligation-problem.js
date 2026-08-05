import { systemPopulated } from '../../../bridge/obligation-source.js'
import { pageOfObligation } from '../../../flow/dispatch.js'
import { journeyFlowOnlyKeys } from '../../../flow/journey-flow.js'
import { leafName, stripIndices } from '../path-key.js'
import {
  REASON_NO_OWNING_PAGE,
  REASON_UNREACHABLE_IN_SCOPE
} from './reasons.js'

// Skip flow-only shims and system-populated fields — neither is presented by
// a page (`flow/dispatch.js` excludes `systemPopulated()` from its coverage
// assertion for the same reason), so they carry no page-reachability concern.
export const isNotPagePresented = (key) =>
  journeyFlowOnlyKeys().includes(stripIndices(key)) ||
  systemPopulated().has(leafName(key))

// The problem (if any) an in-scope obligation contributes: none when it's
// not page-presented, `no-owning-page` when dispatch has no owner, or
// `owning-page-unreachable-in-scope` when the owning page isn't reachable.
export const obligationProblem = (key, reachablePages) => {
  if (isNotPagePresented(key)) {
    return undefined
  }
  const pageId = pageOfObligation(key)
  if (!pageId) {
    return { obligation: key, reason: REASON_NO_OWNING_PAGE }
  }
  return reachablePages.has(pageId)
    ? undefined
    : { obligation: key, pageId, reason: REASON_UNREACHABLE_IN_SCOPE }
}
