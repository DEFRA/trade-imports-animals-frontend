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
  port: 'GB ABD',
  arrival: { day: 12, month: 12, year: 2026 },
  transporter: {
    type: 'Commercial',
    name: 'Transporter Co',
    approvalNumber: 'UK/NEWCA/T1/00090953',
    address: { addressLine1: '7 Route One' }
  },
  // One commodity with per-species rows (line-per-species grain: the
  // prototype stores one commodity line per species; the skeleton stores one
  // complement with a species array). value + resolved display text are
  // captured identically by both systems — 'Bos taurus' is what the
  // prototype's reference data resolves for '1148346' (and therefore what
  // Mapper A re-derives via speciesLabel).
  commodity: {
    name: 'Cow',
    species: [
      {
        value: '1148346',
        text: 'Bos taurus',
        noOfAnimals: '25',
        noOfPackages: '5',
        earTag: 'UK123456789012',
        passport: 'UK123456789'
      }
    ]
  }
}

// The same consignment with a SECOND species on the same commodity — the
// grouping-and-summing case: the skeleton sums the per-species counts into
// the complement totals via getTotal, and Mapper A must consolidate its two
// per-species lines to the identical numbers.
const twoSpeciesCommodity = {
  name: 'Cow',
  species: [
    {
      value: '1148346',
      text: 'Bos taurus',
      noOfAnimals: '25',
      noOfPackages: '5',
      earTag: 'UK123456789012',
      passport: 'UK123456789'
    },
    {
      value: '716661',
      text: 'Bison bison',
      noOfAnimals: '10',
      noOfPackages: '2',
      earTag: 'UK000000000001',
      passport: 'UK000000001'
    }
  ]
}

// (a) The skeleton commodity session object, built exactly as the skeleton
// controllers store it: the complement carries the typeOfCommodity the select
// page submits ('Domestic' — the only real option for 0102), species carries
// value/text/per-species counts/earTag/passport (counts are the raw payload
// strings), and the complement totals are produced by the skeleton's own
// getTotal helper (lodash sum -> Number) over the per-species counts.
const skeletonCommodity = (commodity) => ({
  name: commodity.name,
  commodityComplement: [
    {
      typeOfCommodity: 'Domestic',
      species: commodity.species.map((entry) => ({ ...entry })),
      totalNoOfAnimals: getTotal(
        commodity.species.map((entry) => entry.noOfAnimals)
      ),
      totalNoOfPackages: getTotal(
        commodity.species.map((entry) => entry.noOfPackages)
      )
    }
  ]
})

// (a) The skeleton's per-key session store.
const skeletonSession = (commodity) => ({
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
  [sessionKeys.commodity]: skeletonCommodity(commodity)
})

// (b) The equivalent prototype answers for the same consignment: one commodity
// line per species, each carrying its own counts and one identifier
// unit for the earTag/passport pair.
const prototypeAnswers = (commodity) => {
  const { type, ...transporterParty } = consignment.transporter
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
    commodityLines: commodity.species.map((entry) => ({
      commoditySelection: commodity.name,
      speciesSelection: entry.value,
      // Both test species are Cow/Domestic (type id 16) — the type the
      // skeleton's select page submits as 'Domestic'.
      commodityType: '16',
      numberOfPackages: entry.noOfPackages,
      numberOfAnimalsQuantity: entry.noOfAnimals,
      animalIdentifiers: [
        {
          animalIdentifierEarTag: entry.earTag,
          animalIdentifierPassport: entry.passport
        }
      ]
    }))
  }
}

// Drive the REAL buildNotificationPayload (private to notification-client) via
// the public save(), capturing the exact JSON body the skeleton would POST.
const skeletonNotification = async (commodity) => {
  const session = skeletonSession(commodity)
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
    const skeletonPayload = await skeletonNotification(consignment.commodity)
    const mapperAPayload = answersToNotification(
      prototypeAnswers(consignment.commodity)
    )

    expect(mapperAPayload).toEqual(skeletonPayload)
  })

  it('Should consolidate two per-species lines to the identical summed complement the skeleton POSTs', async () => {
    const skeletonPayload = await skeletonNotification(twoSpeciesCommodity)
    const mapperAPayload = answersToNotification(
      prototypeAnswers(twoSpeciesCommodity)
    )

    expect(mapperAPayload).toEqual(skeletonPayload)
  })
})
