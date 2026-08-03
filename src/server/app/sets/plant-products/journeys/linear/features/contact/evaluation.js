import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import {
  responsiblePersonEmail,
  responsiblePersonName,
  responsiblePersonTelephone
} from '../../../../obligations/index.js'

export const evaluationBindings = feature('contact', [
  scalar({
    field: 'responsiblePersonName',
    obligation: responsiblePersonName
  }),
  scalar({
    field: 'responsiblePersonEmail',
    obligation: responsiblePersonEmail
  }),
  scalar({
    field: 'responsiblePersonTelephone',
    obligation: responsiblePersonTelephone
  })
])
