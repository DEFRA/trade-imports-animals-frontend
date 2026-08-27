const unconfigured = () => {
  throw new Error(
    'journey flow not configured — call configureJourneyFlow() at boot'
  )
}

let configured = {
  sections: [],
  taskRows: [],
  rowStatus: unconfigured,
  nextRunTarget: unconfigured,
  flowOnlyKeys: [],
  entryGuardTarget: unconfigured
}

export const configureJourneyFlow = (journeyFlow) => {
  configured = journeyFlow
}

export const journeySections = () => configured.sections
export const journeyTaskRows = () => configured.taskRows
export const journeyRowStatus = (...args) => configured.rowStatus(...args)
export const journeyNextRunTarget = (...args) =>
  configured.nextRunTarget(...args)
export const journeyFlowOnlyKeys = () => configured.flowOnlyKeys
export const journeyEntryGuardTarget = async (...args) =>
  configured.entryGuardTarget(...args)
export const journeyLayout = () => configured.layout
export const journeySectionCaption = (pageId) =>
  configured.sectionCaption?.(pageId)
