import { describe, expect, it, vi } from 'vitest'

import { documentUploads } from '../../../../../services/document-uploads/index.js'
import { isOwnedByJourney, isSafeUploadId } from './upload-id.js'

describe('plant-products documents upload id guards', () => {
  it.each([
    'upload-abc-123',
    'uploadabc123',
    '0a1b2c3d-4e5f-6789-abcd-ef0123456789'
  ])('accepts %s as a single safe path segment', (uploadId) => {
    expect(isSafeUploadId(uploadId)).toBe(true)
  })

  it.each([
    '../secrets',
    'up/load',
    'up%2Fload',
    'upload.pdf',
    '',
    undefined,
    null,
    42
  ])('refuses %s as an upload id', (uploadId) => {
    expect(isSafeUploadId(uploadId)).toBe(false)
  })

  it('confirms ownership when the upload service names this journey', async () => {
    const uploadId = await documentUploads.upload({
      journeyId: 'GBN-PP-26-ABC001',
      filename: 'phyto.pdf'
    })

    await expect(isOwnedByJourney(uploadId, 'GBN-PP-26-ABC001')).resolves.toBe(
      true
    )
  })

  it('refuses an upload that belongs to another journey', async () => {
    const uploadId = await documentUploads.upload({
      journeyId: 'GBN-PP-26-OTHER1',
      filename: 'phyto.pdf'
    })

    await expect(isOwnedByJourney(uploadId, 'GBN-PP-26-ABC001')).resolves.toBe(
      false
    )
  })

  it('refuses an id the upload service never issued', async () => {
    await expect(
      isOwnedByJourney('upload-never-issued', 'GBN-PP-26-ABC001')
    ).resolves.toBe(false)
  })

  it('refuses an unsafe id without asking the upload service at all', async () => {
    const ownerOf = vi.spyOn(documentUploads, 'ownerOf')

    await expect(
      isOwnedByJourney('../secrets', 'GBN-PP-26-ABC001')
    ).resolves.toBe(false)
    expect(ownerOf).not.toHaveBeenCalled()
    ownerOf.mockRestore()
  })
})
