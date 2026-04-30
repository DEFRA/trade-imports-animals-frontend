export const portOfEntryLighthouseConfig = {
  path: '/port-of-entry',
  variants: [
    {
      name: 'portOfEntryPage',
      preset: 'mobile',
      thresholds: { performance: 0.8, accessibility: 0.7, bestPractices: 0.7 }
    },
    {
      name: 'portOfEntryPage',
      preset: 'desktop',
      thresholds: { performance: 0.6, accessibility: 0.6, bestPractices: 0.8 }
    }
  ]
}
