module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/about',
        'http://localhost:3000/accompanying-documents',
        'http://localhost:3000/additional-details',
        'http://localhost:3000/addresses',
        'http://localhost:3000/auth/organisation',
        'http://localhost:3000/commodities',
        'http://localhost:3000/commodities/details',
        'http://localhost:3000/commodities/identification',
        'http://localhost:3000/commodities/select',
        'http://localhost:3000/consignment/contact/select',
        'http://localhost:3000/consignors/select',
        'http://localhost:3000/cph-number',
        'http://localhost:3000/declaration',
        'http://localhost:3000/destinations/select',
        'http://localhost:3000/import-reason',
        'http://localhost:3000/origin',
        'http://localhost:3000/port-of-entry',
        'http://localhost:3000/transporters',
        'http://localhost:3000/transporters/select'
      ],
      puppeteerScript: './tests/lighthouse/auth-setup.cjs',
      puppeteerLaunchOptions: {
        args: ['--no-sandbox', '--disable-gpu']
      },
      numberOfRuns: 1,
      settings: {
        preset: 'desktop'
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.6 }],
        'categories:accessibility': ['error', { minScore: 0.7 }],
        'categories:best-practices': ['error', { minScore: 0.7 }]
      }
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-report',
      reportFilenamePattern: '%%PATHNAME%%.report.%%EXTENSION%%'
    }
  }
}
