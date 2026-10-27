import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  driveHandler,
  sampleText,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'

import * as documents from '../controller.js'
import {
  fileTypeMessage,
  oversizeMessage,
  MAX_FILE_SIZE_LABEL,
  allowedFileTypesHint
} from '../upload-config.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'
import { leaves } from '../../../../../../../shared/copy-leaves.js'
import { copy as sharedEn } from '../../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../../shared/copy.cy.js'

describe('#copy', () => {
  it('Should have a non-empty string (or string-returning function) at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      const text = sampleText(value, ['sample', 'sample'])
      expect(typeof text, `${path} must resolve to a string`).toBe('string')
      expect(text.trim(), `${path} must not be empty`).not.toBe('')
    }
  })

  it('Should carry the pre-form guidance the trader needs to act on', () => {
    const { guidance } = copy
    expect(guidance.intro).toBe(
      'You must attach an ITAHC if this consignment requires one. If you do not have it now, you can add it later. All documents should be uploaded before the consignment arrives at the UK port. Documents must be in English and you must upload all pages.'
    )
    expect(guidance.otherDocumentsLead).toBe(
      'Other documents you may need to attach include:'
    )
    expect(guidance.otherDocuments).toEqual([
      'import licences or authorisations',
      'commercial documents or invoices'
    ])
    expect(guidance.additional.summary).toBe(
      'Check which additional documents you must upload'
    )
    expect(guidance.additional.rows).toEqual([
      {
        consignment: 'Animals that do not need a health certificate',
        documents: "Exporter's declaration that they are fit to travel"
      },
      {
        consignment: 'Livestock transiting bluetongue restricted territories',
        documents: 'Bluetongue declaration GBHC172'
      },
      {
        consignment: 'Rodents imported for research purposes',
        documents: 'RM39 licence and supplementary health certificate'
      }
    ])
    expect(guidance.additional.linkText).toBe(
      'Check the documents you need on GOV.UK (opens in a new tab)'
    )
    expect(guidance.additional.linkHref).toBe(
      'https://www.gov.uk/guidance/import-of-products-animals-food-and-feed-system'
    )
  })

  it('Should name the thing the file field collects rather than repeat the instruction', () => {
    expect(copy.file.label).toBe('Attachment')
    expect(copy.file.label).not.toBe(copy.title)
    expect(copy.file.label).not.toBe(copy.fileUploadHeading)
    expect(copyCy.file.label).toBe('Atodiad')
    expect(copyCy.file.label).not.toBe(copyCy.fileUploadHeading)
  })

  it('Should state the archive rule and its reason before the trader chooses a file', () => {
    expect(copy.file.noZipFiles).toBe(
      'ZIP files are not allowed for security reasons'
    )
  })

  it('Should state how many documents a notification holds before a file is chosen', () => {
    expect(copy.file.upToMaximum(3)).toBe('up to a maximum of 3 files')
    expect(copy.file.upToMaximum(7)).toBe('up to a maximum of 7 files')
    expect(copyCy.file.upToMaximum(3)).toContain('3')
    expect(copyCy.file.upToMaximum(7)).toContain('7')
  })

  it('Should label the document reference with no hint', () => {
    expect(copy.reference).toEqual({ label: 'Document reference' })
    expect(copyCy.reference).toEqual({ label: 'Cyfeirnod y ddogfen' })
  })

  it('Should hint the date of issue with the shared date example in both locales', () => {
    expect(copy.dateOfIssue.hint).toBe(sharedEn.dateExample)
    expect(copyCy.dateOfIssue.hint).toBe(sharedCy.dateExample)
  })

  it('Should state the file size as files smaller than the size it is given', () => {
    expect(copy.file.smallerThan('20MB')).toBe(
      'files that are smaller than 20MB'
    )
    expect(copy.file.smallerThan('35MB')).toBe(
      'files that are smaller than 35MB'
    )
  })

  it('Should state the file size and the allowed file types in Welsh', () => {
    expect(copyCy.file.smallerThan('20MB')).toBe('yn llai na 20MB')
    expect(copyCy.file.allowedTypes('PDF, DOC')).toBe('yn PDF, DOC')
  })

  it('Should word the list joiner for the file types in both locales', () => {
    expect(copy.file.or).toBe('or')
    expect(copyCy.file.or).toBe('neu')
  })

  it('Should name the hidden table header Action', () => {
    expect(copy.table.actionsHidden).toBe('Action')
    expect(copyCy.table.actionsHidden).toBe('Cam gweithredu')
  })

  it('Should word the drop zone the way the design system does', () => {
    expect(copy.file.chooseButton).toBe('Choose file')
    expect(copy.file.dropInstruction).toBe('or drop file')
    expect(copy.file.noFileChosen).toBe('No file chosen')
    expect(copy.file.enteredDropZone).toBe('Entered drop zone')
    expect(copy.file.leftDropZone).toBe('Left drop zone')
  })

  it('Should state that the check failed without claiming what the scan found', () => {
    expect(copy.scanTags.scanning).toBe('Scanning for virus')
    expect(copy.scanTags.complete).toBe('Check completed')
    expect(copy.scanTags.rejected).toBe('Rejected')
    expect(copy.scanTags.rejected).not.toMatch(/virus/i)
    expect(copy.announce.rejected).not.toMatch(/virus/i)
    expect(copy.scanTags.unknown).toBe('Unknown')
  })

  it('Should name the document the status belongs to for a screen reader', () => {
    expect(copy.scanStatusHidden('GBHC1234567890')).toBe(
      'Virus check status for GBHC1234567890'
    )
    expect(copy.scanStatusHidden('ITAHC-000123')).toBe(
      'Virus check status for ITAHC-000123'
    )
    expect(copyCy.scanStatusHidden('GBHC1234567890')).toContain(
      'GBHC1234567890'
    )
  })

  it('Should build the upload-config messages from the copy templates', () => {
    expect(fileTypeMessage(copy)).toBe(
      copy.errors.fileType(allowedFileTypesHint(copy))
    )
    expect(oversizeMessage(copy)).toBe(
      copy.errors.oversize(MAX_FILE_SIZE_LABEL)
    )
    expect(copy.errors.maxDocuments(10)).toBe(
      'You can upload a maximum of 10 files'
    )
    expect(copy.errors.rejected('cert.pdf')).toBe(
      'cert.pdf cannot be used. Remove it and try again with a different file.'
    )
    expect(copy.errors.rejected('cert.pdf')).not.toMatch(/virus/i)
  })
})

describe('GET /accompanying-documents', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should supply the feature copy module and the shared chrome copy', async () => {
    const get = documents.routes.find((route) => route.method === 'GET').handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
    expect(result.view.context.sharedCopy.saveActions.saveAndContinue).toBe(
      'Save and continue'
    )
    expect(result.view.context.dateOfIssue.label.text).toBe(
      copy.dateOfIssue.label
    )
  })

  it('Should label every offered document type from the feature copy', async () => {
    const get = documents.routes.find((route) => route.method === 'GET').handler
    const result = await driveHandler(get)
    const [selectText, ...types] = result.view.context.documentTypeItems
    expect(selectText.text).toBe(copy.documentType.selectText)
    for (const { value, text } of types) {
      expect(text, `${value} must be labelled`).toBe(copy.types[value])
    }
  })
})
