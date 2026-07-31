import {
  equalsGate,
  includesGate
} from '../../../../model/obligations/helpers/index.js'

const commercialTransporterReason = {
  code: 'obligation.commercialTransporter.applicable.becauseCommercial',
  explanation:
    'commercialTransporter applies when transporterType is Commercial'
}

const privateTransporterReason = {
  code: 'obligation.privateTransporter.applicable.becausePrivate',
  explanation: 'privateTransporter applies when transporterType is Private'
}

const transitedCountriesReason = {
  code: 'obligation.transitedCountries.applicable.becauseLandTransport',
  explanation:
    'transitedCountries applies when meansOfTransport is RAILWAY or ROAD_VEHICLE'
}

// -----------------------------------------------------------------------------
// Transporter type + mutually-exclusive address blocks
// -----------------------------------------------------------------------------

export const transporterType = {
  id: '34d5e6f7-a8b9-4c0a-8dbc-3e4f5a6b7c8d',
  name: 'transporterType',
  status: 'mandatory'
}

// Purge-on-flip: switching transporterType from 'Commercial' to
// 'Private' drops any stored commercialTransporter address.
export const commercialTransporter = {
  id: 'de15c6d7-e8f9-4a04-8b50-dc3d4e5f6071',
  name: 'commercialTransporter',
  applyTo: equalsGate(
    transporterType,
    'Commercial',
    {
      inScope: true,
      status: 'mandatory',
      reasons: [commercialTransporterReason]
    },
    { inScope: false }
  )
}

export const privateTransporter = {
  id: 'ef26d7e8-f9a0-4b15-8c61-ed4e5f607182',
  name: 'privateTransporter',
  applyTo: equalsGate(
    transporterType,
    'Private',
    {
      inScope: true,
      status: 'mandatory',
      reasons: [privateTransporterReason]
    },
    { inScope: false }
  )
}

// -----------------------------------------------------------------------------
// Means of transport + gated transited-countries multi-select
// -----------------------------------------------------------------------------

export const meansOfTransport = {
  id: '45e6f7a8-b9c0-4d1b-8ecd-4f5a6b7c8d9e',
  name: 'meansOfTransport',
  status: 'mandatory'
}

export const transportIdentification = {
  id: '56f7a8b9-c0d1-4e2c-8fde-5a6b7c8d9e0f',
  name: 'transportIdentification',
  status: 'mandatory'
}

export const transportDocumentReference = {
  id: '67a8b9c0-d1e2-4f3d-8aef-6b7c8d9e0f1a',
  name: 'transportDocumentReference',
  status: 'mandatory'
}

// Conditional in-scope-mandatory multi-select — stored as an array of
// country strings. Out of scope (and purged) when means-of-transport
// is not RAILWAY or ROAD_VEHICLE.
const LAND_TRANSPORT_MODES = ['RAILWAY', 'ROAD_VEHICLE']

export const transitedCountries = {
  id: '78b9c0d1-e2f3-4a4e-8bfa-7c8d9e0f1a2b',
  name: 'transitedCountries',
  applyTo: includesGate(
    meansOfTransport,
    LAND_TRANSPORT_MODES,
    {
      inScope: true,
      status: 'mandatory',
      reasons: [transitedCountriesReason]
    },
    { inScope: false }
  )
}
