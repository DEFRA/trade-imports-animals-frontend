export const commodityLines = {
  id: '12c23c6c-0c8e-4570-8c03-53a0565251f4',
  name: 'commodityLines',
  requires: {
    minEntries: 1,
    errorCode: 'obligation.commodityLines.atLeastOne'
  }
}

export const commoditySelection = {
  id: '7a7978f6-28ed-4859-9936-886d91d43cd0',
  name: 'commoditySelection',
  within: commodityLines,
  status: 'mandatory'
}

export const numberOfPackages = {
  id: '74a62b57-1bb0-448e-b72d-0886dd70700a',
  name: 'numberOfPackages',
  within: commodityLines,
  status: 'mandatory'
}

export const packageType = {
  id: '6dee284f-aa8a-4e87-8b2c-63a87e742bfa',
  name: 'packageType',
  within: commodityLines,
  status: 'mandatory'
}

export const quantity = {
  id: '7f0a8e87-d8dd-4eeb-a844-faa8555acdb6',
  name: 'quantity',
  within: commodityLines,
  status: 'mandatory'
}

export const quantityType = {
  id: 'b8aab15f-c37f-4830-9278-6b3d3d2c7aa7',
  name: 'quantityType',
  within: commodityLines,
  status: 'mandatory'
}

export const netWeight = {
  id: '37ae962c-d0ff-4e19-8238-d155bc8f5ce5',
  name: 'netWeight',
  within: commodityLines,
  status: 'mandatory'
}

export const controlledAtmosphereContainer = {
  id: 'd5987751-b005-489c-aeb2-399bdf46cf08',
  name: 'controlledAtmosphereContainer',
  within: commodityLines,
  status: 'optional'
}

export const finishedOrPropagated = {
  id: 'f32b1d5d-9aa7-4e4c-afb2-04ce944ea060',
  name: 'finishedOrPropagated',
  within: commodityLines,
  status: 'optional'
}

export const intendedForFinalUsers = {
  id: '20e2ac72-6d4c-4e21-a7cc-c8caad92a3c0',
  name: 'intendedForFinalUsers',
  within: commodityLines,
  status: 'optional'
}

export const testAndTrial = {
  id: '58af40e2-ac49-44bc-80f5-9d59bcdc7081',
  name: 'testAndTrial',
  within: commodityLines,
  status: 'optional'
}
