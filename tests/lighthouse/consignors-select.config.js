export const consignorsSelectLighthouseConfig = {
  path: '/consignors/select',
  variants: [
    {
      name: 'consignorsSelectPage',
      preset: 'mobile',
      thresholds: { performance: 0.8, accessibility: 0.7, bestPractices: 0.7 }
    },
    {
      name: 'consignorsSelectPage',
      preset: 'desktop',
      thresholds: { performance: 0.6, accessibility: 0.6, bestPractices: 0.8 }
    }
  ]
}
