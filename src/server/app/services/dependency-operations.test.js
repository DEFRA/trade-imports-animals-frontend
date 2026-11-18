import { config } from '../../../config/config.js'
import { withOrganisationId } from '../../common/helpers/organisation-id.js'
import { recordEmfDocuments } from '../../common/test-helpers/emf-documents.js'
import {
  fetchMock,
  resetMocksAndConfigAfterTests
} from '../engine/test-support.js'
import { DRAFT } from '../engine/persistence/records.js'
import { getAddress, listAddresses } from './address-book/client.js'
import { documentUploadSessions } from './cdp-uploader/real.js'
import { fetchCountries } from './countries/client.js'
import { documentUploads } from './document-uploads/real.js'
import { records } from './persistence/records/real/index.js'
import { fetchPortsOfEntry } from './ports/client.js'
import { createTransporter, listTransporters } from './transporters/client.js'
import {
  checkSpecies,
  fetchCommodities
} from '../sets/live-animals/services/commodities/client.js'

const ORGANISATION_ID = '5900001'
const JOURNEY_ID = 'GBN-AG-26-ABC123'
const UPLOAD_ID = 'upload-1'
const CORRELATION_ID = 'correlation-1'
const actor = { id: '2100010101', organisationId: ORGANISATION_ID }

const notification = {
  referenceNumber: JOURNEY_ID,
  status: 'DRAFT',
  fulfilments: [],
  concurrencyToken: 0
}
const page = { items: [], page: 1, pageSize: 25, totalItems: 0, totalPages: 1 }
const address = { id: 'address-1', name: 'Farm', countryCode: 'GB' }

const callTo = (dependency) => (operation, call, body) => ({
  dependency,
  operation,
  call,
  body
})
const backendCall = (operation, call, body = notification) =>
  callTo('animals-backend')(operation, call, body)
const addressBookCall = callTo('address-book')
const referenceDataCall = callTo('reference-data')
const uploaderCall = callTo('cdp-uploader')

const operationCatalogue = [
  backendCall('create-notification', () => records.create(actor)),
  backendCall('copy-notification', () => records.copy(JOURNEY_ID, 0, actor)),
  backendCall('get-fulfilment', () => records.load({ journeyId: JOURNEY_ID })),
  backendCall('list-notifications', () => records.list(), {
    content: [],
    page: 1,
    size: 20,
    totalElements: 0,
    totalPages: 0
  }),
  backendCall('replace-notification', () =>
    records.replaceFulfilment(
      JOURNEY_ID,
      {},
      { known: { journeyId: JOURNEY_ID, status: DRAFT } }
    )
  ),
  backendCall('submit-notification', () =>
    records.finalise(JOURNEY_ID, actor, 0)
  ),
  backendCall('amend-notification', () => records.amend(JOURNEY_ID, actor)),
  backendCall('cancel-amend-notification', () =>
    records.cancelAmend(JOURNEY_ID, actor)
  ),
  backendCall('soft-delete-notification', () =>
    records.softDelete(JOURNEY_ID, actor)
  ),
  backendCall('register-document-upload', () =>
    documentUploads.register({
      journeyId: JOURNEY_ID,
      uploadId: UPLOAD_ID,
      correlationId: CORRELATION_ID
    })
  ),
  backendCall('claim-document-upload', () =>
    documentUploads.claim({ uploadId: UPLOAD_ID, documentType: 'licence' })
  ),
  backendCall('get-document-upload-session', () =>
    documentUploads.findByCorrelationId({
      journeyId: JOURNEY_ID,
      correlationId: CORRELATION_ID
    })
  ),
  backendCall(
    'list-document-uploads',
    () => documentUploads.listByNotification({ journeyId: JOURNEY_ID }),
    { items: [] }
  ),
  backendCall(
    'get-document-upload-status',
    () => documentUploads.scanStatus({ uploadId: UPLOAD_ID }),
    { scanStatus: 'COMPLETE', files: [] }
  ),
  backendCall('delete-document-upload', () =>
    documentUploads.remove(UPLOAD_ID)
  ),
  backendCall('stream-document-file', () =>
    documentUploads.streamFile(UPLOAD_ID)
  ),
  addressBookCall('list-addresses', () => listAddresses(ORGANISATION_ID), page),
  addressBookCall(
    'get-address',
    () => getAddress(ORGANISATION_ID, address.id),
    address
  ),
  addressBookCall(
    'list-transporters',
    () => listTransporters(ORGANISATION_ID),
    page
  ),
  addressBookCall(
    'create-transporter',
    () => createTransporter(ORGANISATION_ID, { name: 'Hauliers Ltd' }),
    { id: 'transporter-1' }
  ),
  referenceDataCall('get-countries', () => fetchCountries(), []),
  referenceDataCall('get-ports-of-entry', () => fetchPortsOfEntry(), []),
  referenceDataCall(
    'search-commodities',
    () => fetchCommodities('cattle', { page: 1, size: 10 }),
    { content: [] }
  ),
  referenceDataCall('check-species', () => checkSpecies([]), { lines: [] }),
  uploaderCall(
    'initiate',
    () =>
      documentUploadSessions.open({
        journeyId: JOURNEY_ID,
        correlationId: CORRELATION_ID,
        returnPath: '/return',
        maxFileSize: 1000,
        mimeTypes: ['application/pdf']
      }),
    { uploadId: UPLOAD_ID }
  ),
  uploaderCall('status', () => documentUploadSessions.read(UPLOAD_ID), {
    uploadStatus: 'ready',
    form: {}
  })
]

const answerEveryRequest = (status, body) => {
  fetchMock.mockResponse(() => ({ status, body: JSON.stringify(body) }))
}

const asOrganisation = (call) => withOrganisationId(ORGANISATION_ID, call)

describe('every dependency call is recorded under its documented operation', () => {
  resetMocksAndConfigAfterTests()
  const emf = recordEmfDocuments()

  beforeEach(() => {
    config.set('stubMode', true)
    fetchMock.enableMocks()
  })

  const recordedCallsTo = async (dependency) => {
    await emf.earlierPublishesFlushed()
    return emf
      .externalCalls()
      .filter((recorded) => recorded.dependency === dependency)
  }

  test.each(operationCatalogue)(
    '$dependency $operation is one successful call when it answers 200',
    async ({ dependency, operation, call, body }) => {
      answerEveryRequest(200, body)

      await asOrganisation(call)

      expect(await recordedCallsTo(dependency)).toEqual([
        { dependency, operation, failure: 0 }
      ])
    }
  )

  test.each(operationCatalogue)(
    '$dependency $operation is one failed call when it answers 503',
    async ({ dependency, operation, call }) => {
      answerEveryRequest(503, {})

      await expect(asOrganisation(call)).rejects.toThrow()

      expect(await recordedCallsTo(dependency)).toEqual([
        { dependency, operation, failure: 1 }
      ])
    }
  )
})
