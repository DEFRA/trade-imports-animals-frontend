export const notificationViewLighthouseConfig = {
  path: '/notification-view/{referenceNumber}',
  variants: [
    {
      name: 'notificationViewPage',
      preset: 'mobile',
      thresholds: { performance: 0.8, accessibility: 0.7, bestPractices: 0.7 }
    },
    {
      name: 'notificationViewPage',
      preset: 'desktop',
      thresholds: { performance: 0.6, accessibility: 0.6, bestPractices: 0.8 }
    }
  ]
}
