import { evaluationBindings as additionalDetails } from './additional-details/evaluation.js'
import { evaluationBindings as addresses } from './addresses/evaluation.js'
import { evaluationBindings as commodities } from './commodities/evaluation.js'
import { evaluationBindings as contact } from './contact/evaluation.js'
import { evaluationBindings as cphNumber } from './cph-number/evaluation.js'
import { evaluationBindings as documents } from './documents/evaluation.js'
import { evaluationBindings as importReason } from './import-reason/evaluation.js'
import { evaluationBindings as origin } from './origin/evaluation.js'
import { evaluationBindings as system } from './system/evaluation.js'
import { evaluationBindings as transport } from './transport/evaluation.js'

export const featureEvaluationBindings = Object.freeze([
  system,
  origin,
  importReason,
  additionalDetails,
  addresses,
  transport,
  contact,
  cphNumber,
  commodities,
  documents
])
