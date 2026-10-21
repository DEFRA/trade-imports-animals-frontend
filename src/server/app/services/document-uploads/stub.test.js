import { describe, expect, it } from 'vitest'

import { randomUUID } from 'node:crypto'
import { documentUploads } from './stub.js'

const CLEAN_FILENAME = 'invoice.pdf'
const VIRUS_FILENAME = 'virus-notes.pdf'
const NEVER_SCANS_FILENAME = 'never-scans.pdf'

// The stub tracks a scan lifecycle per registered upload, so a status read
// needs one registered first.
const registeredUploadId = async () => {
  const uploadId = randomUUID()
  await documentUploads.register({
    journeyId: 'journey-1',
    uploadId,
    correlationId: randomUUID()
  })
  return uploadId
}

describe('#documentUploads', () => {
  describe('#scanStatus', () => {
    it('Should answer PENDING on every read after upload until a refresh read settles it', async () => {
      const uploadId = await registeredUploadId({
        filename: CLEAN_FILENAME
      })
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
      const uploadId = await registeredUploadId({
        filename: VIRUS_FILENAME
      })
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
      ).toEqual({ scanStatus: 'REJECTED' })
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: VIRUS_FILENAME
        })
      ).toEqual({ scanStatus: 'REJECTED' })
    })

    it('Should keep a filename containing "never-scans" PENDING even through refresh reads', async () => {
      const uploadId = await registeredUploadId({
        filename: NEVER_SCANS_FILENAME
      })
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
      ).toEqual({ scanStatus: 'REJECTED' })
    })
  })

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
  })

  describe('#streamFile', () => {
    it('Should serve a canned placeholder PDF, as the stub keeps no uploaded bytes', async () => {
      const uploadId = await registeredUploadId({ filename: 'itahc.pdf' })

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
      const uploadId = await registeredUploadId({
        filename: CLEAN_FILENAME
      })
      await documentUploads.remove(uploadId)
      expect(
        await documentUploads.scanStatus({ uploadId, filename: CLEAN_FILENAME })
      ).toEqual({ scanStatus: 'COMPLETE' })
    })
  })
})
