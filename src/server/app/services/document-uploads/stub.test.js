import { describe, expect, it } from 'vitest'

import { documentUploads } from './stub.js'

const CLEAN_FILENAME = 'invoice.pdf'
const VIRUS_FILENAME = 'virus-notes.pdf'
const NEVER_SCANS_FILENAME = 'never-scans.pdf'
const JOURNEY_ID = 'GBN-PP-26-0001'

describe('#documentUploads', () => {
  describe('#scanStatus', () => {
    it('Should answer PENDING on every read after upload until a refresh read settles it', async () => {
      const uploadId = await documentUploads.upload({
        filename: CLEAN_FILENAME
      })
      expect(
        await documentUploads.scanStatus({ uploadId, filename: CLEAN_FILENAME })
      ).toBe('PENDING')
      expect(
        await documentUploads.scanStatus({ uploadId, filename: CLEAN_FILENAME })
      ).toBe('PENDING')
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: CLEAN_FILENAME,
          refresh: true
        })
      ).toBe('COMPLETE')
      expect(
        await documentUploads.scanStatus({ uploadId, filename: CLEAN_FILENAME })
      ).toBe('COMPLETE')
    })

    it('Should settle a filename containing "virus" as REJECTED on the refresh read, and stay REJECTED', async () => {
      const uploadId = await documentUploads.upload({
        filename: VIRUS_FILENAME
      })
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: VIRUS_FILENAME
        })
      ).toBe('PENDING')
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: VIRUS_FILENAME,
          refresh: true
        })
      ).toBe('REJECTED')
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: VIRUS_FILENAME
        })
      ).toBe('REJECTED')
    })

    it('Should keep a filename containing "never-scans" PENDING even through refresh reads', async () => {
      const uploadId = await documentUploads.upload({
        filename: NEVER_SCANS_FILENAME
      })
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: NEVER_SCANS_FILENAME,
          refresh: true
        })
      ).toBe('PENDING')
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: NEVER_SCANS_FILENAME
        })
      ).toBe('PENDING')
    })

    it('Should settle on the recorded filename, not a caller-supplied one', async () => {
      const uploadId = await documentUploads.upload({
        journeyId: JOURNEY_ID,
        filename: VIRUS_FILENAME
      })

      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: 'clean.pdf',
          refresh: true
        })
      ).toBe('REJECTED')
    })

    it('Should settle on the recorded filename when the caller supplies none', async () => {
      const uploadId = await documentUploads.upload({
        journeyId: JOURNEY_ID,
        filename: VIRUS_FILENAME
      })

      expect(
        await documentUploads.scanStatus({ uploadId, refresh: true })
      ).toBe('REJECTED')
    })

    it('Should reject an uploadId it never issued rather than settling it', async () => {
      await expect(
        documentUploads.scanStatus({
          uploadId: 'forged-id',
          filename: 'invoice.pdf'
        })
      ).rejects.toMatchObject({ status: 404 })
    })
  })

  describe('#ownerOf', () => {
    it('Should report the journey an upload was recorded against', async () => {
      const uploadId = await documentUploads.upload({
        journeyId: JOURNEY_ID,
        filename: 'phyto.pdf'
      })

      expect(await documentUploads.ownerOf(uploadId)).toBe(JOURNEY_ID)
    })

    it('Should reject an uploadId it never issued', async () => {
      await expect(documentUploads.ownerOf('forged-id')).rejects.toMatchObject({
        status: 404
      })
    })
  })

  describe('#upload', () => {
    it('Should mint a distinct uploadId per upload', async () => {
      const first = await documentUploads.upload({ filename: 'a.pdf' })
      const second = await documentUploads.upload({ filename: 'b.pdf' })
      expect(first).not.toBe(second)
    })
  })

  describe('#streamFile', () => {
    it('Should reject an uploadId it never issued', async () => {
      await expect(
        documentUploads.streamFile('forged-id')
      ).rejects.toMatchObject({ status: 404 })
    })

    it('Should serve a canned placeholder PDF, as the stub keeps no uploaded bytes', async () => {
      const uploadId = await documentUploads.upload({ filename: 'itahc.pdf' })

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
    it('Should forget a removed uploadId so it reads as not found', async () => {
      const uploadId = await documentUploads.upload({
        filename: CLEAN_FILENAME
      })
      await documentUploads.remove(uploadId)

      await expect(
        documentUploads.scanStatus({ uploadId, filename: CLEAN_FILENAME })
      ).rejects.toMatchObject({ status: 404 })
    })
  })
})
