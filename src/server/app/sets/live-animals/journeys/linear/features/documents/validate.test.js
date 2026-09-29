import { describe, expect, it } from 'vitest'

import { validation } from './validate.js'
import { copy as en } from './copy/copy.en.js'

const doc = (overrides = {}) => ({
  accompanyingDocumentType: 'ITAHC',
  accompanyingDocumentAttachmentType: 'PDF',
  accompanyingDocumentReference: 'GBHC1234567890',
  accompanyingDocumentDateOfIssue: '2026-01-01',
  ...overrides
})

const readStored = (answers) => validation.onStored(answers)

describe('#documents validation (stored view)', () => {
  it('Should return no errors when no documents are stored', async () => {
    const { errors } = await readStored({})

    expect(errors).toEqual({})
  })

  it('Should return no errors when every stored document has a type and attachment type in the catalogue', async () => {
    const { errors } = await readStored({
      documents: [doc(), doc({ accompanyingDocumentType: 'AIR_WAYBILL' })]
    })

    expect(errors).toEqual({})
  })

  it('Should surface an error when a stored document type is no longer in the catalogue', async () => {
    const { errors } = await readStored({
      documents: [doc({ accompanyingDocumentType: 'RETIRED_CODE' })]
    })

    expect(errors).toEqual({ documents: en.errors.someNoLongerValid })
  })

  it('Should surface an error when a stored attachment type is no longer in the catalogue', async () => {
    const { errors } = await readStored({
      documents: [doc({ accompanyingDocumentAttachmentType: 'HEIC' })]
    })

    expect(errors).toEqual({ documents: en.errors.someNoLongerValid })
  })

  it('Should accept a stored HEALTH_CERTIFICATE type — retained-but-not-offered pins the full catalogue', async () => {
    const { errors } = await readStored({
      documents: [doc({ accompanyingDocumentType: 'HEALTH_CERTIFICATE' })]
    })

    expect(errors).toEqual({})
  })
})

describe('#documents validation (submit view)', () => {
  it('Should be a no-op — add-time rules live in form/errors.js', async () => {
    const { errors } = await validation.onSubmit({})

    expect(errors).toEqual({})
  })
})
