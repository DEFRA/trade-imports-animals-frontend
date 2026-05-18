export const consignmentContactSelectLighthouseConfig = {
  path: '/consignment/contact/select',
  variants: [
    {
      name: 'consignmentContactSelectPage',
      preset: 'mobile',
      thresholds: { performance: 0.8, accessibility: 0.7, bestPractices: 0.7 }
    },
    {
      name: 'consignmentContactSelectPage',
      preset: 'desktop',
      thresholds: { performance: 0.6, accessibility: 0.6, bestPractices: 0.8 }
    }
  ]
}
