// `makeScope` layers two flow-only obligations (importType, declaration) onto
// the projected inScope set so their owning pages stay reachable; the
// notification model does not carry them, so the flow prover skips them —
// their page reachability is a runtime shim covered by the flow/E2E tests,
// not a model concern.
export const FLOW_ONLY_OBLIGATIONS = new Set(['importType', 'declaration'])

export const REASON_NO_OWNING_PAGE = 'no-owning-page'
export const REASON_UNREACHABLE_IN_SCOPE = 'owning-page-unreachable-in-scope'
