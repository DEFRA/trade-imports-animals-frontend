import { afterEach, describe, expect, it, vi } from 'vitest'

import { notificationClient } from '../../../../../../src/server/common/clients/notification-client.js'
import { getTotal } from '../../../../../../src/server/common/helpers/object-helpers.js'
import { sessionKeys } from '../../../../../../src/server/common/constants/session-keys.js'
import { answersToNotification } from './notification-mapper.js'

// notification-client pulls `config` and the pino logger at module load. Neither
// is exercised by buildNotificationPayload — stub them so the import is hermetic.
// buildNotificationPayload itself lives in notification-client and stays real.
vi.mock('../../../../../../src/server/config/config.js', () => ({
  config: {
    get: (key) =>
      key === 'tracing.header' ? 'x-cdp-request-id' : 'http://backend'
  }
}))

vi.mock(
  '../../../../../../src/server/common/helpers/logging/logger.js',
  () => ({
    createLogger: () => ({
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {}
    })
  })
)

afterEach(() => {
  vi.unstubAllGlobals()
})

const address = (name, line1) => ({
  name,
  address: { addressLine1: line1, postcode: 'AB1 2CD' }
})

// ---------------------------------------------------------------------------
// ONE representative consignment, defined once. Both input forms below are
// derived from it: the skeleton's per-key session objects (exactly the shapes
// the skeleton controllers store) and the equivalent prototype answers.
// ---------------------------------------------------------------------------
const consignment = {
  referenceNumber: 'GBN-AG-26-ABC123',
  origin: {
    countryCode: 'FR',
    requiresRegionCode: 'Yes',
    internalReference: 'Imports456GB'
  },
  additionalDetails: {
    certifiedFor: 'Further keeping',
    unweanedAnimals: 'No'
  },
  reasonForImport: 'Internal market',
  addresses: {
    placeOfOrigin: address('Origin Farm', '1 Farm Lane'),
    consignor: address('Consignor Ltd', '2 Depot Road'),
    consignee: address('Consignee Ltd', '3 Dock Street'),
    importer: address('Importer Ltd', '4 Port Way'),
    destination: address('Destination Farm', '5 Field Lane'),
    contact: address('Contact Person', '6 High Street')
  },
  cph: '12/345/6789',
  port: 'ABERDEEN',
  arrival: { day: 12, month: 12, year: 2026 },
  transporter: {
    type: 'Commercial transporter',
    name: 'Transporter Co',
    approvalNumber: 'UK/NEWCA/T1/00090953',
    address: { addressLine1: '7 Route One' }
  },
  // Single commodity line, single species so per-species counts and the
  // line totals are the same quantity — the two systems then only differ (if at
  // all) in how they store/type that quantity, not in aggregation logic.
  commodity: {
    name: '0102 - Cattle',
    typeOfCommodity: 'domestic',
    // value + resolved display text captured identically by both systems.
    // 'Bos taurus (Cattle)' is what the prototype's SPECIES_OPTIONS resolves for
    // 'bos-taurus' (and therefore what Mapper A re-derives via speciesLabel).
    species: { value: 'bos-taurus', text: 'Bos taurus (Cattle)' },
    noOfAnimals: '25',
    noOfPackages: '5',
    earTag: 'UK123456789012',
    passport: 'UK123456789'
  }
}

// (a) The skeleton commodity session object, built exactly as the skeleton
// controllers store it: species carries value/text/per-species counts/earTag/
// passport (counts are the raw payload strings), and the complement totals are
// produced by the skeleton's own getTotal helper (lodash sum -> Number).
const skeletonCommodity = () => {
  const c = consignment.commodity
  return {
    name: c.name,
    commodityComplement: [
      {
        typeOfCommodity: c.typeOfCommodity,
        species: [
          {
            value: c.species.value,
            text: c.species.text,
            noOfAnimals: c.noOfAnimals,
            noOfPackages: c.noOfPackages,
            earTag: c.earTag,
            passport: c.passport
          }
        ],
        totalNoOfAnimals: getTotal([c.noOfAnimals]),
        totalNoOfPackages: getTotal([c.noOfPackages])
      }
    ]
  }
}

// (a) The skeleton's per-key session store.
const skeletonSession = () => ({
  [sessionKeys.referenceNumber]: consignment.referenceNumber,
  [sessionKeys.countryCode]: consignment.origin.countryCode,
  [sessionKeys.requiresRegionCode]: consignment.origin.requiresRegionCode,
  [sessionKeys.internalReference]: consignment.origin.internalReference,
  [sessionKeys.certifiedFor]: consignment.additionalDetails.certifiedFor,
  [sessionKeys.unweanedAnimals]: consignment.additionalDetails.unweanedAnimals,
  [sessionKeys.reasonForImport]: consignment.reasonForImport,
  [sessionKeys.placeOfOrigin]: consignment.addresses.placeOfOrigin,
  [sessionKeys.consignor]: consignment.addresses.consignor,
  [sessionKeys.consignee]: consignment.addresses.consignee,
  [sessionKeys.importer]: consignment.addresses.importer,
  [sessionKeys.destination]: consignment.addresses.destination,
  [sessionKeys.consignmentContactAddress]: consignment.addresses.contact,
  [sessionKeys.cphNumber]: consignment.cph,
  [sessionKeys.portOfEntry]: consignment.port,
  [sessionKeys.arrivalDate]: consignment.arrival,
  [sessionKeys.transporter]: consignment.transporter,
  [sessionKeys.commodity]: skeletonCommodity()
})

// (b) The equivalent prototype answers for the same consignment.
const prototypeAnswers = () => {
  const { type, ...transporterParty } = consignment.transporter
  const c = consignment.commodity
  return {
    referenceNumber: consignment.referenceNumber,
    countryOfOrigin: consignment.origin.countryCode,
    regionOfOriginCodeRequirement: consignment.origin.requiresRegionCode,
    internalReferenceNumber: consignment.origin.internalReference,
    animalsCertifiedFor: consignment.additionalDetails.certifiedFor,
    containsUnweanedAnimals: consignment.additionalDetails.unweanedAnimals,
    reasonForImport: consignment.reasonForImport,
    placeOfOrigin: consignment.addresses.placeOfOrigin,
    consignor: consignment.addresses.consignor,
    consignee: consignment.addresses.consignee,
    importer: consignment.addresses.importer,
    placeOfDestination: consignment.addresses.destination,
    contactAddress: consignment.addresses.contact,
    countyParishHoldingCph: consignment.cph,
    portOfEntry: consignment.port,
    arrivalDateAtPort: consignment.arrival,
    transporterType: type,
    commercialTransporter: transporterParty,
    commodityLines: [
      {
        commoditySelection: c.name,
        typeSelection: c.typeOfCommodity,
        speciesSelection: [c.species.value],
        numberOfPackages: c.noOfPackages,
        numberOfAnimalsQuantity: c.noOfAnimals,
        animalIdentifiers: [
          {
            animalIdentifierEarTag: c.earTag,
            animalIdentifierPassport: c.passport
          }
        ]
      }
    ]
  }
}

// Drive the REAL buildNotificationPayload (private to notification-client) via
// the public save(), capturing the exact JSON body the skeleton would POST.
const skeletonNotification = async () => {
  const session = skeletonSession()
  const request = { yar: { get: (key) => session[key] ?? null } }

  let captured
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url, options) => {
      captured = JSON.parse(options.body)
      return { ok: true, json: async () => ({}) }
    })
  )

  await notificationClient.save(request, 'trace-1')
  return captured
}

describe('Mapper A equivalence with the production skeleton frontend', () => {
  it('Should produce the same backend notification the skeleton POSTs', async () => {
    const skeletonPayload = await skeletonNotification()
    const mapperAPayload = answersToNotification(prototypeAnswers())

    expect(mapperAPayload).toEqual(skeletonPayload)
  })
})
