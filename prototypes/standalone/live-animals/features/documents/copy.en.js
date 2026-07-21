export const copy = {
  title: 'Upload documents',
  reference: {
    label: 'Document reference',
    hint: 'For example, GBHC1234567890.'
  },
  dateOfIssue: {
    label: 'Date of issue',
    hint: 'For example, 12 12 2025'
  },
  file: {
    label: 'Upload a file',
    mustBe: 'Your file must be:',
    smallerThan: 'smaller than',
    a: 'a'
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
  remove: 'Remove',
  removeHidden: (n) => `document ${n}`,
  refreshStatus: 'Refresh virus scan status',
  stillChecking: 'Still checking some documents. Refresh again in a moment.',
  empty: 'You have not added any documents yet.',
  notProvided: 'Not provided',
  continueButton: 'Continue',
  scanTags: {
    safe: 'Safe',
    virusFound: 'Virus found',
    checking: 'Checking',
    unknown: 'Unknown'
  },
  errors: {
    referenceMaxLength: 'Document reference must be 58 characters or fewer',
    dateInvalid: 'Enter a real date of issue',
    referenceRequired: 'Enter a document reference',
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
