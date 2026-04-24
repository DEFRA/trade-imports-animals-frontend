export const destinationsSelectLighthouseConfig = {
  path: '/destinations/select',
  variants: [
    {
      name: 'destinationsSelectPage',
      preset: 'mobile',
      thresholds: { performance: 0.8, accessibility: 0.7, bestPractices: 0.7 }
    },
    {
      name: 'destinationsSelectPage',
      preset: 'desktop',
      thresholds: { performance: 0.6, accessibility: 0.6, bestPractices: 0.8 }
    }
  ]
}
