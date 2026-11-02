import { configureFlowOnlyKeys } from '../bridge/flow-only-keys.js'
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
  previousRunTarget: unconfigured,
  entryGuardTarget: unconfigured
})

const store = setKeyed('journey flow', { configuredBy: 'configureJourneyFlow' })

const configured = () =>
  store.has(currentSetId()) ? store.current() : UNCONFIGURED

export const configureJourneyFlow = (setId, journeyFlow) => {
  store.configure(setId, journeyFlow)
  configureFlowOnlyKeys(setId, journeyFlow.flowOnlyKeys ?? [])
}

export const journeySections = () => configured().sections
export const journeyTaskRows = () => configured().taskRows
export const journeyRowStatus = (...args) => configured().rowStatus(...args)
export const journeyNextRunTarget = (...args) =>
  configured().nextRunTarget(...args)
export const journeyPreviousRunTarget = (...args) =>
  configured().previousRunTarget(...args)
export const journeyEntryGuardTarget = async (...args) =>
  configured().entryGuardTarget(...args)
export const journeyLayout = () => configured().layout
export const journeySectionCaption = (pageId) =>
  configured().sectionCaption?.(pageId)
