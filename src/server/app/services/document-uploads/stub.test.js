import { describe, expect, it } from 'vitest'

import { randomUUID } from 'node:crypto'
import { documentUploads } from './stub.js'

const CLEAN_FILENAME = 'invoice.pdf'
const VIRUS_FILENAME = 'virus-notes.pdf'
const NEVER_SCANS_FILENAME = 'never-scans.pdf'

const registeredUploadFor = async (journeyId) => {
  const upload = { uploadId: randomUUID(), correlationId: randomUUID() }
  await documentUploads.register({ journeyId, ...upload })
  return upload
}

const registeredUploadId = async () =>
  (await registeredUploadFor('journey-1')).uploadId

describe('#documentUploads', () => {
  describe('#scanStatus', () => {
    it('Should answer PENDING on every read after upload until a refresh read settles it', async () => {
      const uploadId = await registeredUploadId()
      expect(
        await documentUploads.scanStatus({ uploadId, filename: CLEAN_FILENAME })
      ).toEqual({ scanStatus: 'PENDING' })
      expect(
        await documentUploads.scanStatus({ uploadId, filename: CLEAN_FILENAME })
      ).toEqual({ scanStatus: 'PENDING' })
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: CLEAN_FILENAME,
          refresh: true
        })
      ).toEqual({ scanStatus: 'COMPLETE' })
      expect(
        await documentUploads.scanStatus({ uploadId, filename: CLEAN_FILENAME })
      ).toEqual({ scanStatus: 'COMPLETE' })
    })

    it('Should settle a filename containing "virus" as REJECTED on the refresh read, and stay REJECTED', async () => {
      const uploadId = await registeredUploadId()
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: VIRUS_FILENAME
        })
      ).toEqual({ scanStatus: 'PENDING' })
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: VIRUS_FILENAME,
          refresh: true
        })
      ).toEqual({ scanStatus: 'REJECTED', rejectionReason: 'FILE_VIRUS' })
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: VIRUS_FILENAME
        })
      ).toEqual({ scanStatus: 'REJECTED', rejectionReason: 'FILE_VIRUS' })
    })

    it('Should keep a filename containing "never-scans" PENDING even through refresh reads', async () => {
      const uploadId = await registeredUploadId()
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: NEVER_SCANS_FILENAME,
          refresh: true
        })
      ).toEqual({ scanStatus: 'PENDING' })
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: NEVER_SCANS_FILENAME
        })
      ).toEqual({ scanStatus: 'PENDING' })
    })

    it.each([
      ['virus-notes.pdf', 'FILE_VIRUS'],
      ['upload-failed.pdf', 'FILE_UPLOAD_FAILED'],
      ['download-failed.pdf', 'FILE_DOWNLOAD_FAILED']
    ])(
      'Should settle %s as REJECTED carrying the reason %s',
      async (filename, rejectionReason) => {
        const uploadId = await registeredUploadId()

        expect(
          await documentUploads.scanStatus({
            uploadId,
            filename,
            refresh: true
          })
        ).toEqual({ scanStatus: 'REJECTED', rejectionReason })
      }
    )

    it('Should settle an unknown uploadId straight from its filename', async () => {
      expect(
        await documentUploads.scanStatus({
          uploadId: 'unknown',
          filename: CLEAN_FILENAME
        })
      ).toEqual({ scanStatus: 'COMPLETE' })
      expect(
        await documentUploads.scanStatus({
          uploadId: 'unknown',
          filename: VIRUS_FILENAME
        })
      ).toEqual({ scanStatus: 'REJECTED', rejectionReason: 'FILE_VIRUS' })
    })
  })

  /**
   * The field rules the claim endpoint enforces, so a stub run shows them too. Stub mode is what
   * the whole unit and fit suite runs against, and a stand-in that took any payload left the
   * page's own reference rule proved by nothing — which is how a reference the endpoint refuses
   * reached a trader.
   */
  describe('#claim', () => {
    const goodClaim = {
      uploadId: 'upload-1',
      documentType: 'ITAHC',
      documentReference: 'CHEDA.GB.2026.1234567',
      dateOfIssue: '2026-01-15'
    }

    it('Should take on a claim the endpoint would accept', async () => {
      await expect(documentUploads.claim(goodClaim)).resolves.toBeUndefined()
    })

    it.each([
      ['documentType', { documentType: '' }],
      ['documentReference', { documentReference: '' }],
      ['documentReference', { documentReference: 'AWB/2026#0001' }],
      ['documentReference', { documentReference: 'R'.repeat(59) }],
      ['dateOfIssue', { dateOfIssue: '' }],
      ['dateOfIssue', { dateOfIssue: '15/01/2026' }]
    ])(
      'Should refuse a claim the endpoint would 400 on %s',
      async (field, override) => {
        await expect(
          documentUploads.claim({ ...goodClaim, ...override })
        ).rejects.toMatchObject({ status: 400, field })
      }
    )

    it('Should take on a reference of fifty-eight characters and refuse one of fifty-nine', async () => {
      await expect(
        documentUploads.claim({
          ...goodClaim,
          documentReference: 'R'.repeat(58)
        })
      ).resolves.toBeUndefined()
      await expect(
        documentUploads.claim({
          ...goodClaim,
          documentReference: 'R'.repeat(59)
        })
      ).rejects.toMatchObject({ status: 400, field: 'documentReference' })
    })

    it('Should take on a reference carrying the separators real references use', async () => {
      await expect(
        documentUploads.claim({
          ...goodClaim,
          documentReference: '125-12345675 A/B.1'
        })
      ).resolves.toBeUndefined()
    })
  })
})

describe('#documentUploads — session lookup, reads and removal', () => {
  describe('#findByCorrelationId', () => {
    it('Should answer the upload registered under that correlationId', async () => {
      const uploadId = randomUUID()
      const correlationId = randomUUID()
      await documentUploads.register({
        journeyId: 'journey-1',
        uploadId,
        correlationId
      })

      await expect(
        documentUploads.findByCorrelationId({
          journeyId: 'journey-1',
          correlationId
        })
      ).resolves.toEqual({ uploadId, correlationId })
    })

    it('Should answer nothing for a correlationId that was never registered', async () => {
      await expect(
        documentUploads.findByCorrelationId({
          journeyId: 'journey-1',
          correlationId: 'never-registered'
        })
      ).resolves.toBeUndefined()
    })

    /**
     * The scoping the backend enforces, so a stub run shows it too. Stub mode is what the whole
     * unit and fit suite runs against, so a stub resolving a handle across notifications would
     * leave that refusal exercised by nothing at all.
     */
    it('Should answer nothing for a handle another notification registered', async () => {
      const correlationId = randomUUID()
      await documentUploads.register({
        journeyId: 'journey-1',
        uploadId: randomUUID(),
        correlationId
      })

      await expect(
        documentUploads.findByCorrelationId({
          journeyId: 'journey-2',
          correlationId
        })
      ).resolves.toBeUndefined()
    })
  })

  /**
   * What the claim leg records, so the page can tell a document the service has taken on from one
   * it has not. Stub mode is what the whole unit and fit suite runs against, so a stand-in that
   * reported nothing taken on would leave the page's own recovery of an unsaved document proved by
   * nothing.
   */
  describe('#listByNotification', () => {
    it('Should report an upload as claimed only once its document details have been taken on', async () => {
      const journeyId = randomUUID()
      const unclaimed = await registeredUploadFor(journeyId)
      const claimed = await registeredUploadFor(journeyId)

      await documentUploads.claim({
        uploadId: claimed.uploadId,
        documentType: 'ITAHC',
        documentReference: 'CHEDA.GB.2026.1234567',
        dateOfIssue: '2026-01-15'
      })

      await expect(
        documentUploads.listByNotification({ journeyId })
      ).resolves.toEqual([
        { ...unclaimed, claimed: false },
        { ...claimed, claimed: true }
      ])
    })

    it('Should report only the uploads the notification itself registered', async () => {
      const journeyId = randomUUID()
      const own = await registeredUploadFor(journeyId)
      await registeredUploadFor(randomUUID())

      await expect(
        documentUploads.listByNotification({ journeyId })
      ).resolves.toEqual([{ ...own, claimed: false }])
    })

    it('Should report nothing for a removed upload', async () => {
      const journeyId = randomUUID()
      const { uploadId } = await registeredUploadFor(journeyId)

      await documentUploads.remove(uploadId)

      await expect(
        documentUploads.listByNotification({ journeyId })
      ).resolves.toEqual([])
    })
  })

  describe('#streamFile', () => {
    it('Should serve a canned placeholder PDF, as the stub keeps no uploaded bytes', async () => {
      const uploadId = await registeredUploadId()

      const response = await documentUploads.streamFile(uploadId)

      expect(response.headers.get('content-type')).toBe('application/pdf')
      expect(response.headers.get('content-disposition')).toBe(
        'inline; filename="placeholder.pdf"'
      )
      const body = await response.text()
      expect(body.startsWith('%PDF-')).toBe(true)
      expect(body).toContain('Placeholder file')
    })
  })

  describe('#remove', () => {
    it('Should settle a removed uploadId from its filename, not the lifecycle', async () => {
      const uploadId = await registeredUploadId()
      await documentUploads.remove(uploadId)
      expect(
        await documentUploads.scanStatus({ uploadId, filename: CLEAN_FILENAME })
      ).toEqual({ scanStatus: 'COMPLETE' })
    })

    it('Should answer nothing for the correlationId of a removed upload', async () => {
      const uploadId = randomUUID()
      const correlationId = randomUUID()
      await documentUploads.register({
        journeyId: 'journey-1',
        uploadId,
        correlationId
      })

      await documentUploads.remove(uploadId)

      await expect(
        documentUploads.findByCorrelationId({
          journeyId: 'journey-1',
          correlationId
        })
      ).resolves.toBeUndefined()
    })
  })
})
