import { appliesForGateValue } from '../../../../../../../bridge/applicability.js'
import { toArray } from './rows/value-text.js'

export const anyLineApplies = (answers, name) =>
  toArray(answers.commodityLines).some((line) =>
    appliesForGateValue(name, line?.commodityCode)
  )

export const regionCodeApplies = (_answers, scope) =>
  scope.has('regionOfOriginCode')

export const purposeApplies = (_answers, scope) =>
  scope.has('purposeInInternalMarket')

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

export const packagesApply = (commodityCode) =>
  appliesForGateValue('numberOfPackages', commodityCode)
