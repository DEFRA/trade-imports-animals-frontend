import { equalsGate } from '../../../../model/obligations/helpers/index.js'

const destinationEnteredReason = {
  code: 'obligation.destination.applicable.becauseEnteredSeparately',
  explanation:
    'destination details apply when the delivery address is not the importer address'
}

const mandatoryDestination = {
  inScope: true,
  status: 'mandatory',
  reasons: [destinationEnteredReason]
}

const optionalDestination = {
  inScope: true,
  status: 'optional',
  reasons: [destinationEnteredReason]
}

const outOfScope = { inScope: false }

export const destinationSameAsConsignee = {
  id: '386cb911-2254-4fdc-9208-5fedf192c15e',
  name: 'destinationSameAsConsignee',
  status: 'mandatory'
}

export const destinationName = {
  id: 'b9a8b2e6-ccc1-4ea3-9f99-54eb521e8c67',
  name: 'destinationName',
  applyTo: equalsGate(
    destinationSameAsConsignee,
    false,
    mandatoryDestination,
    outOfScope
  )
}

export const destinationAddressLine1 = {
  id: 'a40f58f1-f66a-489f-be52-d6b5d2a68ab4',
  name: 'destinationAddressLine1',
  applyTo: equalsGate(
    destinationSameAsConsignee,
    false,
    mandatoryDestination,
    outOfScope
  )
}

export const destinationAddressLine2 = {
  id: '8d2b0ead-03d0-49e8-9924-c7907c069d22',
  name: 'destinationAddressLine2',
  applyTo: equalsGate(
    destinationSameAsConsignee,
    false,
    optionalDestination,
    outOfScope
  )
}

export const destinationAddressLine3 = {
  id: '87b47872-1472-442f-bf6c-eafaf4038078',
  name: 'destinationAddressLine3',
  applyTo: equalsGate(
    destinationSameAsConsignee,
    false,
    optionalDestination,
    outOfScope
  )
}

export const destinationCity = {
  id: 'ee2a6f86-538c-43b9-a656-34807c9b155d',
  name: 'destinationCity',
  applyTo: equalsGate(
    destinationSameAsConsignee,
    false,
    mandatoryDestination,
    outOfScope
  )
}

export const destinationPostcode = {
  id: '83413aca-0cf6-405f-9fac-0d31eb654c8a',
  name: 'destinationPostcode',
  applyTo: equalsGate(
    destinationSameAsConsignee,
    false,
    mandatoryDestination,
    outOfScope
  )
}

export const destinationCountry = {
  id: 'a8574d3d-2161-4908-800b-645d84c6ecb0',
  name: 'destinationCountry',
  applyTo: equalsGate(
    destinationSameAsConsignee,
    false,
    mandatoryDestination,
    outOfScope
  )
}

export const packerName = {
  id: '6b027447-84c0-42a6-bd09-733a63a0f9b8',
  name: 'packerName',
  status: 'optional'
}

export const packerAddressLine1 = {
  id: '5f8ed4b7-aad1-4f1f-a2d6-fdae214b2070',
  name: 'packerAddressLine1',
  status: 'optional'
}

export const packerAddressLine2 = {
  id: 'f2c4c10c-cf23-4930-be81-83583ac6c0de',
  name: 'packerAddressLine2',
  status: 'optional'
}

export const packerAddressLine3 = {
  id: '0bc91905-6920-432e-a544-c6506d34c76e',
  name: 'packerAddressLine3',
  status: 'optional'
}

export const packerCity = {
  id: '6b51722a-8655-4f62-b57d-17c631a36992',
  name: 'packerCity',
  status: 'optional'
}

export const packerPostcode = {
  id: '5a764a59-9370-4b8a-996a-735108c972d9',
  name: 'packerPostcode',
  status: 'optional'
}

export const packerCountry = {
  id: '67ac9cda-38d1-4e02-a7c1-0835411dae68',
  name: 'packerCountry',
  status: 'optional'
}

export const consignorName = {
  id: '5f465f0d-d940-45ef-bcfc-0d21757c7e0b',
  name: 'consignorName',
  status: 'mandatory'
}

export const consignorAddressLine1 = {
  id: '8337f7c6-8a22-49b1-8d56-61796be767e6',
  name: 'consignorAddressLine1',
  status: 'mandatory'
}

export const consignorAddressLine2 = {
  id: '4783fe3e-f645-41b9-8299-6c6cc4d435a1',
  name: 'consignorAddressLine2',
  status: 'optional'
}

export const consignorAddressLine3 = {
  id: '0cef605f-cf3c-49c1-ad46-d443b6770427',
  name: 'consignorAddressLine3',
  status: 'optional'
}

export const consignorCity = {
  id: '9e59991d-5d24-4b71-b352-1e049d434ef8',
  name: 'consignorCity',
  status: 'mandatory'
}

export const consignorPostcode = {
  id: 'a106c038-f9b5-4dff-b987-f55a40106ab0',
  name: 'consignorPostcode',
  status: 'optional'
}

export const consignorTelephone = {
  id: 'ddbc9a28-eee6-4e78-97e7-114750c8cb0b',
  name: 'consignorTelephone',
  status: 'mandatory'
}

export const consignorCountry = {
  id: '625e8c93-43fd-4633-ac5b-ee304a1da5b1',
  name: 'consignorCountry',
  status: 'mandatory'
}

export const consignorEmail = {
  id: '18d8e489-e0dc-4cc7-9f41-d5a20896a452',
  name: 'consignorEmail',
  status: 'mandatory'
}
