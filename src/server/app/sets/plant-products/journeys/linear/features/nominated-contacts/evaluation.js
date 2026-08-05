import {
  feature,
  grouped
} from '../../../../../../bridge/fulfilment-bindings.js'
import {
  contactEmail,
  contactIsAgent,
  contactName,
  contactTelephone,
  nominatedContacts
} from '../../../../obligations/index.js'

const contact = {
  field: 'nominatedContacts',
  token: 'contact',
  obligation: nominatedContacts
}

const contactLeaf = (field, obligation) =>
  grouped({ field, obligation, groups: [contact] })

export const evaluationBindings = feature('nominated-contacts', [
  contactLeaf('contactName', contactName),
  contactLeaf('contactEmail', contactEmail),
  contactLeaf('contactTelephone', contactTelephone),
  contactLeaf('contactIsAgent', contactIsAgent)
])
