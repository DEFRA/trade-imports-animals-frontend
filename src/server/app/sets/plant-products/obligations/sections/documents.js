export const accompanyingDocuments = {
  id: 'ea31f659-9a6d-4262-9d2b-a0bac17a1b19',
  name: 'accompanyingDocuments',
  requires: {
    minEntries: 1,
    errorCode: 'obligation.accompanyingDocuments.required',
    maxEntries: 10,
    maxEntriesErrorCode: 'obligation.accompanyingDocuments.tooMany'
  }
}

export const documentType = {
  id: 'ee5513b4-f563-40a5-acd9-3944bc4f7fb0',
  name: 'documentType',
  within: accompanyingDocuments,
  status: 'mandatory'
}

export const documentReference = {
  id: 'dc31cd6d-e6fd-48b3-b7ed-9e233f394960',
  name: 'documentReference',
  within: accompanyingDocuments,
  status: 'mandatory'
}

export const issueDate = {
  id: '5ec3e8e3-ebae-4e29-bb4e-9a4208694d05',
  name: 'issueDate',
  within: accompanyingDocuments,
  status: 'mandatory'
}

export const uploadId = {
  id: '0aefa5b0-b64f-4a3f-9e36-1ec80cf9e053',
  name: 'uploadId',
  within: accompanyingDocuments,
  status: 'optional'
}

export const filename = {
  id: 'a000ea46-218f-47a3-b5fc-5f95e03a0fc1',
  name: 'filename',
  within: accompanyingDocuments,
  status: 'optional'
}
