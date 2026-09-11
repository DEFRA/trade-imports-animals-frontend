import { appliesForCommodity } from '../../../../../../../bridge/applicability.js'
import { toArray } from './rows/value-text.js'

export const anyLineApplies = (answers, name) =>
  toArray(answers.commodityLines).some((line) =>
    appliesForCommodity(name, line?.commoditySelection)
  )

export const regionCodeApplies = (_answers, scope) =>
  scope.has('regionOfOriginCode')

export const purposeApplies = (_answers, scope) =>
  scope.has('purposeInInternalMarket')

// The three answers the reason for import reveals beyond the purpose. Each
// row stands on the same scope entry that puts its question to the trader, so
// the review shows an exit answer exactly when one was asked for.
export const destinationCountryApplies = (_answers, scope) =>
  scope.has('destinationCountry')

export const exitDateApplies = (_answers, scope) => scope.has('exitDate')

export const portOfExitApplies = (_answers, scope) => scope.has('portOfExit')

export const transitedCountriesApplies = (_answers, scope) =>
  scope.has('transitedCountries')

export const unweanedApplies = (answers) =>
  anyLineApplies(answers, 'containsUnweanedAnimals')

export const cphApplies = (answers) =>
  anyLineApplies(answers, 'countyParishHoldingCph')

export const packagesApply = (commoditySelection) =>
  appliesForCommodity('numberOfPackages', commoditySelection)
