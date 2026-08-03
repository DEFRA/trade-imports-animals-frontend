import { evaluationBindings as additionalDetails } from './additional-details/evaluation.js'
import { evaluationBindings as commodities } from './commodities/evaluation.js'
import { evaluationBindings as origin } from './origin/evaluation.js'
import { evaluationBindings as purpose } from './purpose/evaluation.js'
import { evaluationBindings as transport } from './transport/evaluation.js'

export const featureEvaluationBindings = Object.freeze([
  origin,
  purpose,
  commodities,
  additionalDetails,
  transport
])
