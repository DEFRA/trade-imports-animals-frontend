export const copy = {
  pageTitle: 'Accompanying documents',
  caption: 'Documents',
  heading: 'Accompanying documents',
  insetWarning:
    'A phytosanitary certificate must be attached to the notification or your consignment will be rejected',
  labels: {
    documentType: 'Document type',
    documentReference: 'Document reference',
    issueDate: 'Date of issue',
    file: 'Upload a file (optional)'
  },
  hints: {
    issueDate: 'For example, 27/3/2026',
    file: (allowedTypesHint, maxSizeLabel) =>
      `You do not have to upload a file. If you do, it must be a ${allowedTypesHint} and smaller than ${maxSizeLabel}.`
  },
  placeholderOption: 'Select document type',
  notProvided: 'Not provided',
  table: {
    caption: 'Documents you have added',
    headings: {
      documentType: 'Document type',
      documentReference: 'Document reference',
      issueDate: 'Date of issue',
      status: 'File status',
      actions: 'Actions'
    }
  },
  status: {
    checking: 'Checking',
    safe: 'Safe',
    virus: 'Contains a virus',
    unavailable: 'Status unavailable',
    noFile: 'No file'
  },
  announcements: {
    safe: 'File check complete. The file is safe.',
    virus: 'File check complete. The file contains a virus.',
    unavailable: 'The file check status is unavailable.'
  },
  actions: {
    addDocument: 'Add document',
    remove: 'Remove',
    viewFile: 'View file',
    refresh: 'Refresh virus scan status'
  },
  refreshTimeout:
    'Some files are still being checked. Refresh again in a moment.',
  errors: {
    hiddenPrefix: 'Error:',
    documentTypeRequired: 'Select a document type',
    referenceRequired: 'Enter a reference',
    referenceMaxLength: 'Document reference must be 100 characters or fewer',
    dateRequired: 'Enter a date of issue',
    dateInvalid: 'Date of issue must be a real date',
    fileFallbackName: 'The file',
    fileType: (allowedTypesHint) =>
      `The selected file must be a ${allowedTypesHint}`,
    fileEmpty: 'The selected file is empty',
    oversize: (maxSizeLabel) =>
      `The selected file must be smaller than ${maxSizeLabel}`,
    uploadFailed: 'The file could not be uploaded. Try again.',
    virus: (filename) =>
      `${filename} contains a virus. Remove it and try again with a different file.`,
    removeFailed: 'The document could not be removed. Try again.',
    cannotContinue:
      'You cannot continue until all files have been checked or removed',
    maxDocuments: (max) => `You can add a maximum of ${max} documents`
  }
}
