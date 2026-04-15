export const animalsIdentificationDetailsLighthouseConfig = {
  path: '/commodities/identification',
  variants: [
    {
      name: 'animalsIdentificationDetailsPage',
      preset: 'mobile',
      thresholds: { performance: 0.8, accessibility: 0.7, bestPractices: 0.7 }
    },
    {
      name: 'animalsIdentificationDetailsPage',
      preset: 'desktop',
      thresholds: { performance: 0.6, accessibility: 0.6, bestPractices: 0.8 }
    }
  ]
}
