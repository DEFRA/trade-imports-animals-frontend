export const consignorAddressSelectLighthouseConfig = {
  path: '/address/select',
  variants: [
    {
      name: 'consignorAddressSelectPage',
      preset: 'mobile',
      thresholds: { performance: 0.8, accessibility: 0.7, bestPractices: 0.7 }
    },
    {
      name: 'consignorAddressSelectPage',
      preset: 'desktop',
      thresholds: { performance: 0.6, accessibility: 0.6, bestPractices: 0.8 }
    }
  ]
}
