export const originLighthouseConfig = {
  path: '/origin',
  variants: [
    {
      name: 'countryOfOriginPage',
      preset: 'mobile',
      thresholds: { performance: 0.6, accessibility: 0.7, bestPractices: 0.7 }
    },
    {
      name: 'countryOfOriginPage',
      preset: 'desktop',
      thresholds: { performance: 0.5, accessibility: 0.6, bestPractices: 0.8 }
    }
  ],
  thresholds: {
    performance: 0.6,
    accessibility: 0.7,
    bestPractices: 0.7
  }
}
