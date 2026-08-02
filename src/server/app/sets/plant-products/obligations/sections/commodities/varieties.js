import { allowListed } from '../../../../../model/obligations/helpers/index.js'
import { classApplicableSpecies } from '../../../services/commodities/index.js'
import { eppoCode, species } from './species.js'

const varietyClassReason = {
  code: 'obligation.varietyClass.applicable.becauseClassApplicableSpecies',
  explanation:
    'varietyClass applies to varieties whose species supports a class'
}

export const varieties = {
  id: '173ee411-99cb-4fb5-b646-8069a7c100ee',
  name: 'varieties',
  within: species
}

export const variety = {
  id: 'baebeb1e-fe0b-4c83-a033-8e9fbb4fc6d3',
  name: 'variety',
  within: varieties,
  status: 'mandatory'
}

export const varietyClass = {
  id: '2d33ede4-83ca-433c-8512-0b9d008f8ad2',
  name: 'varietyClass',
  within: varieties,
  status: 'optional',
  applyTo: allowListed(eppoCode, classApplicableSpecies, varieties, [
    varietyClassReason
  ])
}
