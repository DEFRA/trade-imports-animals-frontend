import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'

import * as documents from '../controller.js'
import {
  FILE_TYPE_MESSAGE,
  OVERSIZE_FILE_MESSAGE,
  ALLOWED_FILE_TYPES_HINT,
  MAX_FILE_SIZE_LABEL
} from '../upload-config.js'
import { copy } from './copy.en.js'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('#copy', () => {
  // Parameterised strings are copy FUNCTIONS: a leaf may be a function of
  // sample arguments returning the finished sentence.
  it('Should have a non-empty string (or string-returning function) at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      const text =
        typeof value === 'function' ? value('sample', 'sample') : value
      expect(typeof text, `${path} must resolve to a string`).toBe('string')
      expect(text.trim().length, `${path} must not be empty`).toBeGreaterThan(0)
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
        documents: "An exporter's declaration that they are fit to travel"
      },
      {
        consignment: 'Livestock transiting bluetongue restricted territories',
        documents: 'Bluetongue declaration GBHC172'
      },
      {
        consignment: 'Rodents imported for research purposes',
        documents: 'An RM39 licence and supplementary health certificate'
      }
    ])
    // The hard-coded target="_blank" in template.njk requires the GDS new-tab suffix.
    expect(guidance.additional.linkText).toBe(
      'Check the documents you need on GOV.UK (opens in a new tab)'
    )
    // The design's href carried prototype analytics parameters; ours is clean.
    expect(guidance.additional.linkHref).toBe(
      'https://www.gov.uk/guidance/import-of-products-animals-food-and-feed-system'
    )
  })

  it('Should state the archive rule and its reason before the trader chooses a file', () => {
    // The allow-list refuses a ZIP either way; this bullet is the only place
    // the trader is told so, and told why, ahead of choosing.
    expect(copy.file.noZipFiles).toBe(
      'ZIP files are not allowed for security reasons'
    )
  })

  it('Should word the drop zone the way the design system does', () => {
    // The template hands these to govukFileUpload, so a drift here silently
    // reworded a control traders meet elsewhere on GOV.UK.
    expect(copy.file.chooseButton).toBe('Choose file')
    expect(copy.file.dropInstruction).toBe('or drop file')
    expect(copy.file.noFileChosen).toBe('No file chosen')
    expect(copy.file.enteredDropZone).toBe('Entered drop zone')
    expect(copy.file.leftDropZone).toBe('Left drop zone')
  })

  it('Should build the upload-config messages from the copy templates', () => {
    expect(FILE_TYPE_MESSAGE).toBe(
      copy.errors.fileType(ALLOWED_FILE_TYPES_HINT)
    )
    expect(OVERSIZE_FILE_MESSAGE).toBe(
      copy.errors.oversize(MAX_FILE_SIZE_LABEL)
    )
    expect(copy.errors.maxDocuments(10)).toBe(
      'You can add a maximum of 10 documents'
    )
    expect(copy.errors.virusFound('cert.pdf')).toBe(
      'cert.pdf contains a virus. Remove it and try again with a different file.'
    )
  })
})

describe('GET /accompanying-documents', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

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
    const [placeholder, ...types] = result.view.context.documentTypeItems
    expect(placeholder.text).toBe(copy.documentType.placeholder)
    for (const { value, text } of types) {
      expect(text, `${value} must be labelled`).toBe(copy.types[value])
    }
  })
})
