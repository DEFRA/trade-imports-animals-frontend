import { evaluationBindings as additionalDetails } from './additional-details/evaluation.js'
import { evaluationBindings as commodities } from './commodities/evaluation.js'
import { evaluationBindings as contact } from './contact/evaluation.js'
import { evaluationBindings as documents } from './documents/evaluation.js'
import { evaluationBindings as goodsMovement } from './goods-movement/evaluation.js'
import { evaluationBindings as nominatedContacts } from './nominated-contacts/evaluation.js'
import { evaluationBindings as origin } from './origin/evaluation.js'
import { evaluationBindings as purpose } from './purpose/evaluation.js'
import { evaluationBindings as transport } from './transport/evaluation.js'
import { evaluationBindings as traders } from './traders/evaluation.js'

export const featureEvaluationBindings = Object.freeze([
  origin,
  purpose,
  commodities,
  additionalDetails,
  transport,
  goodsMovement,
  contact,
  nominatedContacts,
  documents,
  traders
])
