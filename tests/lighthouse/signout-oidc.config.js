export const signoutOidcLighthouseConfig = {
  path: '/auth/sign-out-oidc',
  variants: [
    {
      name: 'signoutOidcPage',
      preset: 'mobile',
      thresholds: { performance: 0.8, accessibility: 0.7, bestPractices: 0.7 }
    },
    {
      name: 'signoutOidcPage',
      preset: 'desktop',
      thresholds: { performance: 0.6, accessibility: 0.6, bestPractices: 0.8 }
    }
  ]
}
