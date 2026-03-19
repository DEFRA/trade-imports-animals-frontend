export const signinOidcLighthouseConfig = {
  path: '/auth/sign-in-oidc',
  variants: [
    {
      name: 'signinOidcPage',
      preset: 'mobile',
      thresholds: { performance: 0.8, accessibility: 0.7, bestPractices: 0.7 }
    },
    {
      name: 'signinOidcPage',
      preset: 'desktop',
      thresholds: { performance: 0.6, accessibility: 0.6, bestPractices: 0.8 }
    }
  ]
}
