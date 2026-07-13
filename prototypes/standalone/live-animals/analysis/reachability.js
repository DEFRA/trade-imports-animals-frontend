import { pageOfObligation } from '../flow/dispatch.js'
import { reconcile } from '../engine/evaluate/reconcile.js'
import { registry, walkObligations } from '../registry.js'
import { pathKey } from '../lib/path.js'
import { simulateJourney } from './simulate.js'

export const enumerateScopeStates = () =>
  ['no', 'yes'].flatMap((regionOfOriginCodeRequirement) =>
    ['', 'internalMarket'].flatMap((reasonForImport) =>
      ['', 'Road Vehicle'].flatMap((meansOfTransport) =>
        ['', 'Commercial', 'Private'].map((transporterType) => ({
          regionOfOriginCodeRequirement,
          reasonForImport,
          meansOfTransport,
          transporterType
        }))
      )
    )
  )

const registeredObligations = new Set(
  [...walkObligations()].map((node) => node.obligation)
)

export const orphanedRootIds = new Set(
  registry.all
    .filter(
      (obligation) =>
        obligation.activatedBy &&
        !registeredObligations.has(obligation.activatedBy.obligation)
    )
    .map((obligation) => obligation.id)
)

const gateValue = (activatedBy) => {
  if ('equals' in activatedBy) return activatedBy.equals
  if ('includes' in activatedBy) return [].concat(activatedBy.includes)[0]
  if ('present' in activatedBy) return activatedBy.present ? 'x' : ''
  return undefined
}

function scaffoldFor(templatePath) {
  const segments = templatePath.split('.')
  const scaffold = {}
  const instancePath = []
  const frameStack = [{ frame: scaffold, forest: registry.all }]
  let inItem = false
  segments.forEach((id, index) => {
    const { frame, forest } = frameStack[frameStack.length - 1]
    const obligation = forest.find((candidate) => candidate.id === id)
    const gate = obligation.activatedBy
    if (inItem && gate && forest.includes(gate.obligation)) {
      frame[gate.obligation.id] = gateValue(gate)
    }
    if (gate?.frame === 'anyItem') {
      const collection = forest.find((candidate) =>
        candidate.item?.includes(gate.obligation)
      )
      if (collection) {
        frame[collection.id] = [{ [gate.obligation.id]: gateValue(gate) }]
      }
    }
    if (gate?.frame === 'enclosing') {
      for (let depth = frameStack.length - 1; depth >= 0; depth--) {
        if (frameStack[depth].forest.includes(gate.obligation)) {
          frameStack[depth].frame[gate.obligation.id] = gateValue(gate)
          break
        }
      }
    }
    const isAncestorCollection =
      obligation.collection && index < segments.length - 1
    if (isAncestorCollection) {
      const entry = {}
      frame[id] = [entry]
      frameStack.push({ frame: entry, forest: obligation.item })
      inItem = true
      instancePath.push(id, 0)
    } else {
      instancePath.push(id)
    }
  })
  return { scaffold, instancePath }
}

const withoutBlanks = (state) =>
  Object.fromEntries(Object.entries(state).filter(([, value]) => value !== ''))
const submitReadySeed = {
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'no',
  reasonForImport: 'internalMarket',
  purposeInInternalMarket: 'breeding',
  animalsCertifiedFor: 'slaughter',
  containsUnweanedAnimals: 'no',
  countyParishHoldingCph: '12/345/6789',
  commodityLines: [
    {
      commoditySelection: 'Cow',
      typeSelection: 'Domestic',
      speciesSelection: ['1148346'],
      numberOfPackages: '5',
      numberOfAnimalsQuantity: '25',
      animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
    }
  ],
  consignor: {
    name: 'Astra Rosales',
    address: {
      addressLine1: '43 East Hague Extension',
      country: 'Switzerland'
    }
  },
  placeOfDestination: {
    name: 'Tech Imports Ltd',
    address: { addressLine1: '643 Main Street', country: 'United Kingdom' }
  },
  placeOfOrigin: {
    name: 'Origin Farm',
    address: { addressLine1: '1 Farm Lane', country: 'Ireland' }
  },
  consignee: {
    name: 'British Livestock Ltd',
    address: {
      addressLine1: '10 Market Street',
      country: 'United Kingdom'
    }
  },
  importer: {
    name: 'Import Co UK',
    address: { addressLine1: '20 Trade Road', country: 'United Kingdom' }
  },
  portOfEntry: 'Aberdeen Airport',
  arrivalDateAtPort: { day: '12', month: '12', year: '2026' },
  meansOfTransport: 'Airplane',
  transportIdentification: 'FR-892-LK',
  transportDocumentReference: 'CMR-2026-884721',
  transporterType: 'Commercial',
  commercialTransporter: {
    name: 'García Livestock Transport SL',
    address: {
      addressLine1: '43 East Hague Extension',
      country: 'Switzerland'
    },
    approvalNumber: 'ES-T2-45001294'
  },
  contactAddress: {
    name: 'Animal and Plant Health Agency',
    address: { addressLine1: 'Woodham Lane', country: 'United Kingdom' }
  },
  declaration: 'confirmed'
}

export function buildWitnesses() {
  const states = enumerateScopeStates()
  const witnesses = []
  for (const { templatePath, obligation } of walkObligations()) {
    if (obligation.system) continue
    if (orphanedRootIds.has(templatePath.split('.')[0])) continue
    const { scaffold, instancePath } = scaffoldFor(templatePath)
    const targetKey = pathKey(instancePath)
    let answers = null
    for (const state of states) {
      const candidate = {
        ...submitReadySeed,
        ...withoutBlanks(state),
        ...scaffold
      }
      if (reconcile(candidate).inScope.has(targetKey)) {
        answers = candidate
        break
      }
    }
    witnesses.push({ templatePath, targetKey, answers })
  }
  return witnesses
}

export function proveReachability({ pagesFor = simulateJourney } = {}) {
  const problems = []
  for (const { templatePath, targetKey, answers } of buildWitnesses()) {
    if (!answers) {
      problems.push({
        obligation: templatePath,
        targetKey,
        reason: 'no-witness-puts-in-scope'
      })
      continue
    }
    const pageId = pageOfObligation(targetKey)
    if (!pageId) {
      problems.push({
        obligation: templatePath,
        targetKey,
        reason: 'no-owning-page'
      })
      continue
    }
    if (!new Set(pagesFor(answers)).has(pageId)) {
      problems.push({
        obligation: templatePath,
        targetKey,
        pageId,
        reason: 'owning-page-unreachable-in-scope',
        answers
      })
    }
  }
  return problems
}
