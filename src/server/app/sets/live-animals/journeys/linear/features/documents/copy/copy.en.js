import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'

const addAnother = 'Save and add another'

export const copy = {
  title: 'Upload documents',
  guidance: {
    intro:
      'You must attach an ITAHC if this consignment requires one. If you do not have it now, you can add it later. All documents should be uploaded before the consignment arrives at the UK port. Documents must be in English and you must upload all pages.',
    otherDocumentsLead: 'Other documents you may need to attach include:',
    otherDocuments: [
      'import licences or authorisations',
      'commercial documents or invoices'
    ],
    additional: {
      summary: 'Check which additional documents you must upload',
      caption: 'Additional documents by type of consignment',
      consignment: 'Consignment',
      documentsNeeded: 'Documents needed',
      rows: [
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
      ],
      linkText: 'Check the documents you need on GOV.UK (opens in a new tab)',
      linkHref:
        'https://www.gov.uk/guidance/import-of-products-animals-food-and-feed-system'
    }
  },
  fileUploadHeading: 'File upload',
  reference: {
    label: 'Document reference'
  },
  documentType: {
    label: 'Document type',
    selectText: 'Select one'
  },
  dateOfIssue: {
    label: 'Date of issue',
    hint: sharedCopy.dateExample
  },
  file: {
    label: 'Attachment',
    mustBe: 'Your file must be:',
    smallerThan: (size) => `files that are smaller than ${size}`,
    or: 'or',
    allowedTypes: (hint) => hint,
    upToMaximum: (max) => `up to a maximum of ${max} files`,
    noZipFiles: 'ZIP files are not allowed for security reasons',
    chooseButton: 'Choose file',
    dropInstruction: 'or drop file',
    noFileChosen: 'No file chosen',
    enteredDropZone: 'Entered drop zone',
    leftDropZone: 'Left drop zone'
  },
  addAnother,
  table: {
    caption: 'Documents you have added',
    reference: 'Document reference',
    type: 'Document type',
    dateOfIssue: 'Date of issue',
    status: 'Status',
    actionsHidden: 'Action'
  },
  types: {
    ITAHC: 'Intra Trade Animal Health Certificate (ITAHC)',
    VETERINARY_HEALTH_CERTIFICATE: 'Veterinary health certificate',
    AIR_WAYBILL: 'Air waybill',
    IMPORT_PERMIT: 'Import permit',
    LETTER_OF_AUTHORITY: 'Letter of authority (Directive 2008/61/EC)',
    COMMERCIAL_INVOICE: 'Commercial invoice',
    SEA_WAYBILL: 'Sea waybill',
    RAIL_WAYBILL: 'Rail waybill',
    BILL_OF_LADING: 'Bill of lading',
    CATCH_CERTIFICATE: 'Catch certificate',
    LABORATORY_SAMPLING_RESULTS_FOR_AFLATOXIN:
      'Laboratory sampling results for aflatoxin (Reg 2019/1793)',
    HEALTH_CERTIFICATE: 'Health certificate',
    JOURNEY_LOG: 'Journey log',
    OTHER: 'Other'
  },
  remove: 'Remove',
  removeHidden: (documentNumber) => `document ${documentNumber}`,
  viewFile: 'View file',
  viewFileHidden: (documentNumber) => `for document ${documentNumber}`,
  refreshStatus: 'Refresh virus scan status',
  stillChecking: 'Still checking some documents. Refresh again in a moment.',
  notProvided: 'Not provided',
  scanTags: {
    complete: 'Check completed',
    rejected: 'Rejected',
    virusFound: 'Virus found',
    uploadFailed: 'Upload failed',
    downloadFailed: 'Download failed',
    scanning: 'Scanning for virus',
    unknown: 'Unknown'
  },
  scanStatusHidden: (reference) => `Virus check status for ${reference}`,
  announce: {
    safe: 'Document scan complete: the file is safe to use',
    rejected:
      'Document check failed: the file cannot be used. Remove it and try again.',
    virusFound:
      'Document check failed: the file contains a virus. Remove it and try again.',
    uploadFailed:
      'Document check failed: the file could not be uploaded. Remove it and try again.',
    downloadFailed:
      'Document check failed: the file could not be downloaded. Remove it and try again.'
  },
  errors: {
    hiddenPrefix: 'Error:',
    referenceMaxLength: 'Document reference must be 100 characters or fewer',
    referenceCharacters:
      'Document reference must only include letters, numbers, spaces, hyphens, full stops and forward slashes',
    dateInvalid: 'Enter a real date',
    referenceRequired: 'Enter a document reference',
    typeRequired: 'Select a document type',
    dateRequired: 'Enter a date of issue',
    fileRequired: 'Upload a document',
    fileEmpty: 'The selected file is empty',
    fileVirus: 'The selected file contains a virus',
    fileDownloadFailed: 'The selected file could not be downloaded',
    cannotContinue:
      'You cannot continue until all documents have been scanned or removed',
    documentNotSaved: (saveAction) =>
      `Sorry, there is a problem with the service. Your document was uploaded but has not been saved to this notification. Select ‘${saveAction}’ to try again.`,
    documentsUnchecked: (saveAction) =>
      `Sorry, there is a problem with the service. We could not check that every document you uploaded is saved to this notification. Select ‘${saveAction}’ to try again.`,
    uploadFailed: 'The selected file could not be uploaded. Try again.',
    uploadUnavailable:
      'Documents cannot be uploaded at the moment. Reload the page or come back later.',
    maxDocuments: (max) => `You can upload a maximum of ${max} files`,
    fileFallbackName: 'The file',
    rejected: (filename) =>
      `${filename} cannot be used. Remove it and try again with a different file.`,
    fileType: (allowedTypesHint) =>
      `The selected file must be a ${allowedTypesHint}`,
    oversize: (maxSizeLabel) =>
      `The selected file must be smaller than ${maxSizeLabel}`,
    someNoLongerValid:
      'One or more of your saved documents are no longer valid. Review the list before you continue.',
    someStillScanning:
      'One or more of your documents are still being scanned. Wait a moment and try again.',
    someRejected:
      'One or more of your documents were rejected. Return to Documents to remove and re-upload.'
  }
}
