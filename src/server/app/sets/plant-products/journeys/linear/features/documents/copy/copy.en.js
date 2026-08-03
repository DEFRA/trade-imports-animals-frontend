export const copy = {
  pageTitle: 'Accompanying documents',
  caption: 'Documents',
  heading: 'Accompanying documents',
  insetWarning:
    'A phytosanitary certificate must be attached to the notification or your consignment will be rejected',
  labels: {
    documentType: 'Document type',
    documentReference: 'Document reference',
    issueDate: 'Date of issue'
  },
  hints: {
    issueDate: 'For example, 27/3/2026'
  },
  placeholderOption: 'Select document type',
  table: {
    caption: 'Documents you have added',
    headings: {
      documentType: 'Document type',
      documentReference: 'Document reference',
      issueDate: 'Date of issue'
    }
  },
  actions: {
    addDocument: 'Add document',
    remove: 'Remove'
  },
  errors: {
    documentTypeRequired: 'Select a document type',
    referenceRequired: 'Enter a reference',
    referenceMaxLength: 'Document reference must be 100 characters or fewer',
    dateRequired: 'Enter a date of issue',
    dateInvalid: 'Date of issue must be a real date'
  }
}
