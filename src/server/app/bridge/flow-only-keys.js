import { currentSetId, setKeyed } from '../shared/set-context.js'

// The flow-only-key seam, kept in bridge so `bridge/obligation-source.js` and
// `bridge/scope.js` consume it as a sibling. L1 hands the journey's list to
// `configureJourneyFlow`, which forwards it here; the default is `[]`, so an
// unconfigured platform recognises and projects no flow-only key — the same
// answer `flow/journey-flow.js` gave from its UNCONFIGURED fallback before.
// Its only import is `shared/set-context.js`, which itself imports nothing from
// the app, so no importer forms a cycle — the graph stays a DAG and bridge
// never reaches up into flow.

const store = setKeyed('flow-only keys')

export const configureFlowOnlyKeys = (setId, keys) => {
  store.configure(setId, keys)
}

export const flowOnlyKeys = () =>
  store.has(currentSetId()) ? store.current() : []
