import {
  allowListed,
  equalsGate
} from '../../../../model/obligations/helpers/index.js'
import {
  hasControlPoints,
  list as listBcps
} from '../../services/reference/bcps.js'

const inspectionPremisesReason = {
  code: 'obligation.inspectionPremises.applicable.becauseBcpHasPremises',
  explanation:
    'inspectionPremises applies when the border control post offers inspection premises'
}

const containersReason = {
  code: 'obligation.containers.applicable.becauseContainersUsed',
  explanation: 'containers applies when containers are used'
}

const bcpsWithControlPoints = () =>
  listBcps()
    .map(({ value }) => value)
    .filter(hasControlPoints)

export const borderControlPost = {
  id: 'c3383df0-c61f-4b3f-b677-43562a2b511c',
  name: 'borderControlPost',
  status: 'mandatory'
}

const premisesAllowlist = allowListed(
  borderControlPost,
  bcpsWithControlPoints,
  null,
  [inspectionPremisesReason]
)

const inspectionPremisesApplyTo = (...args) => {
  const decision = premisesAllowlist(...args)
  return decision.reasons
    ? { inScope: decision.inScope, reasons: decision.reasons }
    : { inScope: decision.inScope }
}
inspectionPremisesApplyTo.metadata = premisesAllowlist.metadata

export const inspectionPremises = {
  id: 'bc457257-4b11-4ffe-8b0e-e426a6fdc699',
  name: 'inspectionPremises',
  applyTo: inspectionPremisesApplyTo
}

export const meansOfTransport = {
  id: 'd452a50e-61a2-4a7c-8c71-6531895f5243',
  name: 'meansOfTransport',
  status: 'mandatory'
}

export const transportIdentification = {
  id: '2042a62e-a455-4833-8af3-ee38c36d937b',
  name: 'transportIdentification',
  status: 'mandatory'
}

export const transportDocumentReference = {
  id: 'bcbb4da0-545a-4f2a-8079-10780cb1102b',
  name: 'transportDocumentReference',
  status: 'mandatory'
}

export const arrivalDate = {
  id: '07614057-4a9d-4300-b07b-df6573de4958',
  name: 'arrivalDate',
  status: 'mandatory'
}

export const arrivalTime = {
  id: '66ede0ef-d652-4f6e-8303-2adb14fb1faf',
  name: 'arrivalTime',
  status: 'mandatory'
}

export const usesContainers = {
  id: 'bc998ce5-fbfe-4ad4-b20f-b47758800334',
  name: 'usesContainers',
  status: 'mandatory'
}

export const containers = {
  id: '7d91fcaf-53f2-43c3-80a3-beb905127e06',
  name: 'containers',
  applyTo: equalsGate(
    usesContainers,
    true,
    { inScope: true, reasons: [containersReason] },
    { inScope: false }
  )
}

export const containerNumber = {
  id: 'f546cd40-3911-4189-90d9-5237312e6bff',
  name: 'containerNumber',
  within: containers,
  status: 'optional'
}

export const sealNumber = {
  id: '5415fd02-1740-4ab1-a318-1b0e7abf4284',
  name: 'sealNumber',
  within: containers,
  status: 'optional'
}

export const officialSeal = {
  id: '4c63bb32-40ed-4678-a593-202197ed5e63',
  name: 'officialSeal',
  within: containers,
  status: 'optional'
}
