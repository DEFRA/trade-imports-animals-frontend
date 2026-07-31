import { packageCountCommodities } from '../../../../../services/commodities/index.js'
import { allowListed } from '../../../../../model/obligations/helpers/index.js'

const numberOfPackagesReason = {
  code: 'obligation.numberOfPackages.applicable.becausePackageCountCommodity',
  explanation:
    'numberOfPackages applies on lines whose commodityCode is in the package-count list'
}

// -----------------------------------------------------------------------------
// Commodity line — user-driven indexed group. Each commodity line
// carries commodityCode + commodityType + species + numberOfAnimals and
// (conditionally) numberOfPackages. Line-instance ids are opaque
// orchestrator-generated ULIDs — mnemonic `line1` / `line2` etc. in
// tests and docs.
// -----------------------------------------------------------------------------

export const commodityLine = {
  id: '20e5f607-1829-4c3d-8abc-06d7e8f9a0b2',
  name: 'commodityLines',
  // No applyTo — structural group, always in scope. Instance ids
  // inferred from field-record composite-key prefixes.
  //
  // Collection floor: V4 requires at least one commodity line on
  // every consignment. Without this floor a zero-line session is
  // vacuously satisfied — see state-queries.js
  // `groupInvariantErrors`.
  requires: {
    minEntries: 1,
    errorCode: 'obligation.commodityLine.atLeastOne'
  }
}

export const commodityCode = {
  id: '21f60718-192a-4d4e-8bcd-17e8f9a0b1c3',
  name: 'commoditySelection',
  within: commodityLine,
  status: 'mandatory'
}

// Spec: "Where applicable for given commodity, user is able to filter
// species by type." Ambiguous whether Type itself is commodity-gated
// or whether that phrase describes UX for species filtering. Modelled
// as unconditional field record for now.
export const commodityType = {
  id: '22071829-2a3b-4e5f-8cde-28f9a0b1c2d4',
  name: 'commodityType',
  within: commodityLine,
  status: 'mandatory'
}

// Multi-select; stored value is an array of species strings per line.
// The obligation model treats the array opaquely.
export const species = {
  id: '2318293a-3b4c-4f60-8def-39a0b1c2d3e5',
  name: 'speciesSelection',
  within: commodityLine,
  status: 'mandatory'
}

export const numberOfAnimals = {
  id: '24192a3b-4c5d-4a71-8ef0-4ab1c2d3e4f6',
  name: 'numberOfAnimalsQuantity',
  within: commodityLine,
  status: 'mandatory'
}

// Depth-1 commodity-gated field record. `applyTo` returns records
// = matching line-ids; no projection group needed (the gate lives at
// the same identity level as the gated obligation). Uses `allowListed`
// with `null` projection (NOT `includesGate`) — see helpers.js
// taxonomy: the gate `commodityCode` is `within: commodityLine`, so
// `fulfilments[commodityCode.id]` is a records-map, not a scalar.
// The allowlist is the service's package-count list; only entries that
// are picker names can ever match a stored selection.
export const numberOfPackages = {
  id: '252a3b4c-5d6e-4b82-8f01-5bc2d3e4f507',
  name: 'numberOfPackages',
  within: commodityLine,
  status: 'optional',
  applyTo: allowListed(commodityCode, packageCountCommodities(), null, [
    numberOfPackagesReason
  ])
}
