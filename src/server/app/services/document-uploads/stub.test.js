import { describe, expect, it } from 'vitest'

import { documentUploads } from './stub.js'

describe('#documentUploads', () => {
  describe('#scanStatus', () => {
    it('Should answer PENDING on every read after upload until a refresh read settles it', async () => {
      const uploadId = await documentUploads.upload({
        filename: 'invoice.pdf'
      })
      expect(
        await documentUploads.scanStatus({ uploadId, filename: 'invoice.pdf' })
      ).toBe('PENDING')
      expect(
        await documentUploads.scanStatus({ uploadId, filename: 'invoice.pdf' })
      ).toBe('PENDING')
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: 'invoice.pdf',
          refresh: true
        })
      ).toBe('COMPLETE')
      expect(
        await documentUploads.scanStatus({ uploadId, filename: 'invoice.pdf' })
      ).toBe('COMPLETE')
    })

    it('Should settle a filename containing "virus" as REJECTED on the refresh read, and stay REJECTED', async () => {
      const uploadId = await documentUploads.upload({
        filename: 'virus-notes.pdf'
      })
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: 'virus-notes.pdf'
        })
      ).toBe('PENDING')
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: 'virus-notes.pdf',
          refresh: true
        })
      ).toBe('REJECTED')
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: 'virus-notes.pdf'
        })
      ).toBe('REJECTED')
    })

    it('Should keep a filename containing "never-scans" PENDING even through refresh reads', async () => {
      const uploadId = await documentUploads.upload({
        filename: 'never-scans.pdf'
      })
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: 'never-scans.pdf',
          refresh: true
        })
      ).toBe('PENDING')
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: 'never-scans.pdf'
        })
      ).toBe('PENDING')
    })

    it('Should settle on the recorded filename, not a caller-supplied one', async () => {
      const uploadId = await documentUploads.upload({
        journeyId: 'GBN-PP-26-0001',
        filename: 'virus-notes.pdf'
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
        journeyId: 'GBN-PP-26-0001',
        filename: 'virus-notes.pdf'
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
        journeyId: 'GBN-PP-26-0001',
        filename: 'phyto.pdf'
      })

      expect(await documentUploads.ownerOf(uploadId)).toBe('GBN-PP-26-0001')
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
        filename: 'invoice.pdf'
      })
      await documentUploads.remove(uploadId)

      await expect(
        documentUploads.scanStatus({ uploadId, filename: 'invoice.pdf' })
      ).rejects.toMatchObject({ status: 404 })
    })
  })
})
