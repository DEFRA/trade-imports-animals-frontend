export const uploadReceivedLighthouseConfig = {
  path: '/accompanying-documents/upload-received',
  variants: [
    {
      name: 'uploadReceivedPage',
      preset: 'mobile',
      thresholds: { performance: 0.8, accessibility: 0.7, bestPractices: 0.7 }
    },
    {
      name: 'uploadReceivedPage',
      preset: 'desktop',
      thresholds: { performance: 0.6, accessibility: 0.6, bestPractices: 0.8 }
    }
  ]
}
