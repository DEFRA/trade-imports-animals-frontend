export const responsiblePersonName = {
  id: '2e0fffce-e46f-4348-9883-e73deb654b97',
  name: 'responsiblePersonName',
  status: 'mandatory'
}

export const responsiblePersonEmail = {
  id: '4bbf823b-5cfe-485b-8095-fbb55e42e74e',
  name: 'responsiblePersonEmail',
  status: 'optional'
}

export const responsiblePersonTelephone = {
  id: 'e747c745-0889-45c4-aef0-42389e4d7ddf',
  name: 'responsiblePersonTelephone',
  status: 'optional'
}

export const nominatedContacts = {
  id: '0e680da8-2c58-41cc-884c-88a1231a396b',
  name: 'nominatedContacts',
  requires: { maxEntries: 5 }
}

export const contactName = {
  id: 'aeaef2c3-bb4e-4760-b6dd-22e8441b190a',
  name: 'contactName',
  within: nominatedContacts,
  status: 'mandatory'
}

export const contactEmail = {
  id: '66da4529-7715-49d4-9dd9-d496ff5fefc2',
  name: 'contactEmail',
  within: nominatedContacts,
  status: 'optional'
}

export const contactTelephone = {
  id: 'f35dd9fe-e9f0-4316-aa37-4557bfcda6fd',
  name: 'contactTelephone',
  within: nominatedContacts,
  status: 'optional'
}

export const contactIsAgent = {
  id: '30530b37-df70-4e31-9a54-1d29b836285d',
  name: 'contactIsAgent',
  within: nominatedContacts,
  status: 'optional'
}
