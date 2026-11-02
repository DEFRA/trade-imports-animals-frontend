import { packageCountCommodityCodes } from '../../../services/commodities/index.js'
import { allowListed } from '../../../../../model/obligations/helpers/index.js'

const numberOfPackagesReason = {
  code: 'obligation.numberOfPackages.applicable.becausePackageCountCommodity',
  explanation:
    'numberOfPackages applies on lines whose commodityCode is in the package-count list'
}

export const commodityLine = {
  id: '20e5f607-1829-4c3d-8abc-06d7e8f9a0b2',
  name: 'commodityLines',
  requires: {
    minEntries: 1,
    errorCode: 'obligation.commodityLine.atLeastOne'
  }
}

export const commodityCode = {
  id: '21f60718-192a-4d4e-8bcd-17e8f9a0b1c3',
  name: 'commodityCode',
  within: commodityLine,
  status: 'mandatory'
}

export const commodityType = {
  id: '22071829-2a3b-4e5f-8cde-28f9a0b1c2d4',
  name: 'commodityType',
  within: commodityLine,
  status: 'mandatory'
}

export const speciesLatinName = {
  id: '2318293a-3b4c-4f60-8def-39a0b1c2d3e5',
  name: 'speciesLatinName',
  within: commodityLine,
  status: 'mandatory'
}

export const speciesCommonName = {
  id: 'c8824345-0a1a-421d-8f35-f932fa1874f7',
  name: 'speciesCommonName',
  within: commodityLine,
  status: 'optional'
}

export const numberOfAnimals = {
  id: '24192a3b-4c5d-4a71-8ef0-4ab1c2d3e4f6',
  name: 'numberOfAnimalsQuantity',
  within: commodityLine,
  status: 'mandatory'
}

export const numberOfPackages = {
  id: '252a3b4c-5d6e-4b82-8f01-5bc2d3e4f507',
  name: 'numberOfPackages',
  within: commodityLine,
  status: 'optional',
  applyTo: allowListed(commodityCode, packageCountCommodityCodes, null, [
    numberOfPackagesReason
  ])
}
