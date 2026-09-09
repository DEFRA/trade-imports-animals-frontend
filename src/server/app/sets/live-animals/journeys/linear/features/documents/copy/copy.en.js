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
      ],
      linkText: 'Check the documents you need on GOV.UK (opens in a new tab)',
      linkHref:
        'https://www.gov.uk/guidance/import-of-products-animals-food-and-feed-system'
    }
  },
  fileUploadHeading: 'File upload',
  reference: {
    label: 'Document reference',
    hint: 'For example, GBHC1234567890.'
  },
  documentType: {
    label: 'Document type',
    placeholder: 'Select one'
  },
  dateOfIssue: {
    label: 'Date of issue',
    hint: 'For example, 12/12/2025'
  },
  file: {
    label: 'Upload a file',
    mustBe: 'Your file must be:',
    smallerThan: 'smaller than',
    a: 'a',
    // The limit is stated here before the trader picks a file, and again by
    // errors.maxDocuments once they reach it (design release 1). Both take the
    // number as an argument so the hint and the error cannot disagree.
    upToMaximum: (max) => `up to a maximum of ${max} files`,
    noZipFiles: 'ZIP files are not allowed for security reasons',
    // Wording for the JavaScript-enhanced drop zone. These match the design
    // system's own defaults so the control reads the way traders meet it
    // elsewhere on GOV.UK.
    chooseButton: 'Choose file',
    dropInstruction: 'or drop file',
    noFileChosen: 'No file chosen',
    enteredDropZone: 'Entered drop zone',
    leftDropZone: 'Left drop zone'
  },
  addAnother: 'Save and add another',
  table: {
    caption: 'Documents you have added',
    reference: 'Document reference',
    type: 'Document type',
    dateOfIssue: 'Date of issue',
    status: 'Status',
    actionsHidden: 'Actions'
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
  empty: 'You have not added any documents yet.',
  notProvided: 'Not provided',
  // The Status column reports the virus check, not a verdict on the file
  // (design release 1): "Scanning for virus" while it runs, "Check completed"
  // once it has. Virus found and Unknown have no design release 1 counterpart
  // and keep the wording this service already uses.
  scanTags: {
    complete: 'Check completed',
    virusFound: 'Virus found',
    scanning: 'Scanning for virus',
    unknown: 'Unknown'
  },
  // Read out ahead of the tag so the status names the document it belongs to.
  // The tag carries no other text, so without this a screen reader hears
  // "Check completed" with nothing saying what was checked.
  scanStatusHidden: (reference) => `Virus check status for ${reference}`,
  announce: {
    safe: 'Document scan complete: the file is safe to use',
    virusFound:
      'Document scan failed: a virus was found. Remove the file and try again.'
  },
  errors: {
    hiddenPrefix: 'Error:',
    referenceMaxLength: 'Document reference must be 58 characters or fewer',
    dateInvalid: 'Enter a real date of issue',
    referenceRequired: 'Enter a document reference',
    typeRequired: 'Select a document type',
    dateRequired: 'Enter the date of issue',
    fileRequired: 'Select a file to upload',
    cannotContinue:
      'You cannot continue until all documents have been scanned or removed',
    uploadFailed: 'The file could not be uploaded. Try again.',
    maxDocuments: (max) => `You can add a maximum of ${max} documents`,
    fileFallbackName: 'The file',
    virusFound: (filename) =>
      `${filename} contains a virus. Remove it and try again with a different file.`,
    fileType: (allowedTypesHint) =>
      `The selected file must be a ${allowedTypesHint}`,
    oversize: (maxSizeLabel) =>
      `The selected file must be smaller than ${maxSizeLabel}`
  }
}
