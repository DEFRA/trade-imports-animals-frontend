import { appliesForCommodity } from '../../../bridge/applicability.js'
import { toArray } from './rows/value-text.js'

export const anyLineApplies = (answers, name) =>
  toArray(answers.commodityLines).some((line) =>
    appliesForCommodity(name, line?.commoditySelection)
  )

export const regionCodeApplies = (answers, scope) =>
  scope.has('regionOfOriginCode')

export const purposeApplies = (answers, scope) =>
  scope.has('purposeInInternalMarket')

export const transitedCountriesApplies = (answers, scope) =>
  scope.has('transitedCountries')

export const unweanedApplies = (answers) =>
  anyLineApplies(answers, 'containsUnweanedAnimals')

export const cphApplies = (answers) =>
  anyLineApplies(answers, 'countyParishHoldingCph')

export const packagesApply = (commoditySelection) =>
  appliesForCommodity('numberOfPackages', commoditySelection)
