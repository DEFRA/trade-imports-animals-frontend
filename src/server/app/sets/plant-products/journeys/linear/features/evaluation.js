import { inputMethodBindings as commodityInputMethod } from './commodities/evaluation.js'
import { evaluationBindings as origin } from './origin/evaluation.js'
import { evaluationBindings as purpose } from './purpose/evaluation.js'
import { evaluationBindings as transport } from './transport/evaluation.js'

export const featureEvaluationBindings = Object.freeze([
  origin,
  purpose,
  commodityInputMethod,
  transport
])
