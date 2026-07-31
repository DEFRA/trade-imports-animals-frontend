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

    it('Should settle an unknown uploadId straight from its filename', async () => {
      expect(
        await documentUploads.scanStatus({
          uploadId: 'unknown',
          filename: 'invoice.pdf'
        })
      ).toBe('COMPLETE')
      expect(
        await documentUploads.scanStatus({
          uploadId: 'unknown',
          filename: 'virus-notes.pdf'
        })
      ).toBe('REJECTED')
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
    it('Should settle a removed uploadId from its filename, not the lifecycle', async () => {
      const uploadId = await documentUploads.upload({
        filename: 'invoice.pdf'
      })
      await documentUploads.remove(uploadId)
      expect(
        await documentUploads.scanStatus({ uploadId, filename: 'invoice.pdf' })
      ).toBe('COMPLETE')
    })
  })
})
