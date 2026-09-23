import { currentSetId, setKeyed } from '../shared/set-context.js'

const unconfigured = () => {
  throw new Error(
    'journey flow not configured — call configureJourneyFlow() at boot'
  )
}

const UNCONFIGURED = Object.freeze({
  sections: [],
  taskRows: [],
  rowStatus: unconfigured,
  nextRunTarget: unconfigured,
  flowOnlyKeys: [],
  entryGuardTarget: unconfigured
})

const store = setKeyed('journey flow', { configuredBy: 'configureJourneyFlow' })

// Reading before configuration is the un-booted case, which must report itself
// through `unconfigured` rather than through setKeyed's "no such set" error.
const configured = () =>
  store.has(currentSetId()) ? store.current() : UNCONFIGURED

export const configureJourneyFlow = (setId, journeyFlow) => {
  store.configure(setId, journeyFlow)
}

export const journeySections = () => configured().sections
export const journeyTaskRows = () => configured().taskRows
export const journeyRowStatus = (...args) => configured().rowStatus(...args)
export const journeyNextRunTarget = (...args) =>
  configured().nextRunTarget(...args)
export const journeyFlowOnlyKeys = () => configured().flowOnlyKeys
export const journeyEntryGuardTarget = async (...args) =>
  configured().entryGuardTarget(...args)
export const journeyLayout = () => configured().layout
export const journeySectionCaption = (pageId) =>
  configured().sectionCaption?.(pageId)
