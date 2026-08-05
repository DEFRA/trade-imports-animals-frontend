import { setKeyed } from '../shared/set-context.js'

const unconfigured = () => {
  throw new Error(
    'journey flow not configured — call configureJourneyFlow() at boot'
  )
}

const defaults = {
  sections: [],
  taskRows: [],
  rowStatus: unconfigured,
  nextRunTarget: unconfigured,
  flowOnlyKeys: [],
  entryGuardTarget: unconfigured
}

const store = setKeyed('journey flow')

export const configureJourneyFlow = (setId, journeyFlow) => {
  store.configure(setId, { ...defaults, ...journeyFlow })
}

export const journeySections = () => store.current().sections
export const journeyTaskRows = () => store.current().taskRows
export const journeyRowStatus = (...args) => store.current().rowStatus(...args)
export const journeyNextRunTarget = (...args) =>
  store.current().nextRunTarget(...args)
export const journeyFlowOnlyKeys = () => store.current().flowOnlyKeys
export const journeyEntryGuardTarget = (...args) =>
  store.current().entryGuardTarget(...args)
export const journeyLayout = () => store.current().layout
export const journeyCyaSlug = () => store.current().cyaSlug
