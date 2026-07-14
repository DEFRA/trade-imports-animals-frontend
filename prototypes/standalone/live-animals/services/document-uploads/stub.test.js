import { describe, expect, it } from 'vitest'

import { documentUploads } from './stub.js'

describe('document-uploads stub — canned scan lifecycle', () => {
  it('Should answer PENDING on the first status read after upload, then COMPLETE', async () => {
    const uploadId = await documentUploads.upload({ filename: 'invoice.pdf' })
    expect(
      await documentUploads.scanStatus({ uploadId, filename: 'invoice.pdf' })
    ).toBe('PENDING')
    expect(
      await documentUploads.scanStatus({ uploadId, filename: 'invoice.pdf' })
    ).toBe('COMPLETE')
  })

  it('Should settle a filename containing "virus" as REJECTED after the pending read', async () => {
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
        filename: 'virus-notes.pdf'
      })
    ).toBe('REJECTED')
  })

  it('Should keep a filename containing "never-scans" PENDING on every read', async () => {
    const uploadId = await documentUploads.upload({
      filename: 'never-scans.pdf'
    })
    for (let read = 0; read < 3; read += 1) {
      expect(
        await documentUploads.scanStatus({
          uploadId,
          filename: 'never-scans.pdf'
        })
      ).toBe('PENDING')
    }
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

  it('Should mint a distinct uploadId per upload', async () => {
    const first = await documentUploads.upload({ filename: 'a.pdf' })
    const second = await documentUploads.upload({ filename: 'b.pdf' })
    expect(first).not.toBe(second)
  })

  it('Should settle a removed uploadId from its filename, not the lifecycle', async () => {
    const uploadId = await documentUploads.upload({ filename: 'invoice.pdf' })
    await documentUploads.remove(uploadId)
    expect(
      await documentUploads.scanStatus({ uploadId, filename: 'invoice.pdf' })
    ).toBe('COMPLETE')
  })
})
