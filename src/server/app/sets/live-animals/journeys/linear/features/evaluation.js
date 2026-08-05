import { evaluationBindings as additionalDetails } from './additional-details/evaluation.js'
import { evaluationBindings as addresses } from './addresses/evaluation.js'
import { evaluationBindings as commodities } from './commodities/evaluation.js'
import { evaluationBindings as contact } from './contact/evaluation.js'
import { evaluationBindings as cphNumber } from './cph-number/evaluation.js'
import { evaluationBindings as destinationCountry } from './destination-country/evaluation.js'
import { evaluationBindings as documents } from './documents/evaluation.js'
import { evaluationBindings as exitDate } from './exit-date/evaluation.js'
import { evaluationBindings as importPurpose } from './import-purpose/evaluation.js'
import { evaluationBindings as importReason } from './import-reason/evaluation.js'
import { evaluationBindings as origin } from './origin/evaluation.js'
import { evaluationBindings as portOfExit } from './port-of-exit/evaluation.js'
import { evaluationBindings as system } from './system/evaluation.js'
import { evaluationBindings as transport } from './transport/evaluation.js'

export const featureEvaluationBindings = Object.freeze([
  system,
  origin,
  importReason,
  importPurpose,
  destinationCountry,
  portOfExit,
  exitDate,
  additionalDetails,
  addresses,
  transport,
  contact,
  cphNumber,
  commodities,
  documents
])
