export const accompanyingDocumentsLighthouseConfig = {
  path: '/accompanying-documents',
  variants: [
    {
      name: 'accompanyingDocumentsPage',
      preset: 'mobile',
      thresholds: { performance: 0.8, accessibility: 0.7, bestPractices: 0.7 }
    },
    {
      name: 'accompanyingDocumentsPage',
      preset: 'desktop',
      thresholds: { performance: 0.6, accessibility: 0.6, bestPractices: 0.8 }
    }
  ]
}
